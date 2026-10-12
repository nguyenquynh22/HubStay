const db = require("../common/db");
const {
  sortRecommendedPosts,
  getHomePageLimit,
} = require("../lib/home-recommendations");
const { buildKeywordConditions } = require("../lib/post-search");

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const PostImageModeration = require("../services/post_image_moderation.service");

const invalidPostInput = (message) =>
  Object.assign(new Error(message), { code: "INVALID_POST_INPUT" });

class postsRepository {
  static calculateDistanceKm(fromLat, fromLng, toLat, toLng) {
    const earthRadiusKm = 6371;
    const latDelta = ((toLat - fromLat) * Math.PI) / 180;
    const lngDelta = ((toLng - fromLng) * Math.PI) / 180;
    const a =
      Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
      Math.cos((fromLat * Math.PI) / 180) *
        Math.cos((toLat * Math.PI) / 180) *
        Math.sin(lngDelta / 2) *
        Math.sin(lngDelta / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  static async getAll() {
    const sql = `
      SELECT p.*, (SELECT GROUP_CONCAT(image_url ORDER BY is_cover DESC, image_id SEPARATOR '||') FROM post_images WHERE post_id = p.post_id) AS image_urls, p.author_id AS user_id, p.post_type AS type, p.address_detail AS address, p.post_lat AS latitude, p.post_lng AS longitude, (SELECT image_url FROM post_images pi WHERE pi.post_id = p.post_id ORDER BY pi.is_cover DESC, pi.image_id LIMIT 1) AS image_url, u.full_name as author_name, u.avatar_url, u.is_verified, u.is_vip, u.vip_expires_at,
             CASE WHEN COALESCE(u.is_vip, 0) = 1 AND (u.vip_expires_at IS NULL OR u.vip_expires_at > NOW()) THEN 1 ELSE 0 END AS is_vip_active,
             CASE WHEN COALESCE(u.is_verified, 0) = 1 THEN 1 ELSE 0 END AS is_verified_active
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.user_id
      WHERE p.status = 'AVAILABLE' AND p.is_approved = 1
      ORDER BY is_vip_active DESC, is_verified_active DESC, p.created_at DESC
    `;
    const [rows] = await db.query(sql);
    return rows;
  }

  static async getById(id) {
    const sql = `
      SELECT p.*, (SELECT GROUP_CONCAT(image_url ORDER BY is_cover DESC, image_id SEPARATOR '||') FROM post_images WHERE post_id = p.post_id) AS image_urls, p.author_id AS user_id, p.post_type AS type, p.address_detail AS address, p.post_lat AS latitude, p.post_lng AS longitude, (SELECT image_url FROM post_images pi WHERE pi.post_id = p.post_id ORDER BY pi.is_cover DESC, pi.image_id LIMIT 1) AS image_url, u.full_name as author_name, u.avatar_url, u.is_verified, u.is_vip, u.vip_expires_at,
             CASE WHEN COALESCE(u.is_vip, 0) = 1 AND (u.vip_expires_at IS NULL OR u.vip_expires_at > NOW()) THEN 1 ELSE 0 END AS is_vip_active,
             CASE WHEN COALESCE(u.is_verified, 0) = 1 THEN 1 ELSE 0 END AS is_verified_active
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.user_id
      WHERE p.post_id = ? AND p.status = 'AVAILABLE' AND p.is_approved = 1
    `;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  }

  static async getByAuthorId(authorId, sortOrder = "DESC") {
    const order = sortOrder === "ASC" ? "ASC" : "DESC";
    const sql = `
      SELECT p.*, (SELECT GROUP_CONCAT(image_url ORDER BY is_cover DESC, image_id SEPARATOR '||') FROM post_images WHERE post_id = p.post_id) AS image_urls, p.author_id AS user_id, p.post_type AS type, p.address_detail AS address, p.post_lat AS latitude, p.post_lng AS longitude, (SELECT image_url FROM post_images pi WHERE pi.post_id = p.post_id ORDER BY pi.is_cover DESC, pi.image_id LIMIT 1) AS image_url, u.full_name as author_name, u.avatar_url, u.is_verified, u.is_vip, u.vip_expires_at,
             CASE WHEN COALESCE(u.is_vip, 0) = 1 AND (u.vip_expires_at IS NULL OR u.vip_expires_at > NOW()) THEN 1 ELSE 0 END AS is_vip_active,
             CASE WHEN COALESCE(u.is_verified, 0) = 1 THEN 1 ELSE 0 END AS is_verified_active
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.user_id
      WHERE p.author_id = ?
      ORDER BY p.created_at ${order}, p.post_id ${order}
    `;
    const [rows] = await db.query(sql, [authorId]);
    return rows;
  }

  static async create(data) {
    const payloadImages = Array.isArray(data.images)
      ? data.images.filter(Boolean)
      : [];
    if (payloadImages.length > 6) {
      throw invalidPostInput("Mỗi bài đăng chỉ được tải tối đa 6 ảnh.");
    }
    let totalImageBytes = 0;
    for (const imageUrl of payloadImages) {
      if (typeof imageUrl !== "string") {
        throw invalidPostInput("Định dạng ảnh không hợp lệ.");
      }
      const dataUri = imageUrl.match(
        /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/,
      );
      if (imageUrl.startsWith("data:") && !dataUri) {
        throw invalidPostInput(
          "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP; video không được hỗ trợ.",
        );
      }
      if (dataUri) {
        const imageBytes = Buffer.from(dataUri[2], "base64").length;
        if (!imageBytes || imageBytes > 8 * 1024 * 1024) {
          throw invalidPostInput("Mỗi ảnh không được vượt quá 8 MB.");
        }
        totalImageBytes += imageBytes;
      } else if (/\.(mp4|mov|m4v|webm|avi)(?:[?#].*)?$/i.test(imageUrl)) {
        throw invalidPostInput("Video không được hỗ trợ trong bài đăng.");
      } else if (!PostImageModeration.isCloudinaryImageUrl(imageUrl)) {
        const error = new Error(
          "Không thể kiểm duyệt ảnh này. Chỉ chấp nhận ảnh tải trực tiếp hoặc ảnh Cloudinary hợp lệ.",
        );
        error.statusCode = 400;
        throw error;
      }
    }
    if (totalImageBytes > 30 * 1024 * 1024) {
      throw invalidPostInput("Tổng dung lượng ảnh không được vượt quá 30 MB.");
    }

    const imageModeration = await PostImageModeration.inspectPostImages(
      payloadImages,
    );
    if (imageModeration.blocked) {
      const category =
        imageModeration.category ??
        imageModeration.findings?.[0]?.category ??
        "MANUAL_REVIEW_REQUIRED";
      const offTopicLabel = PostImageModeration.getVietnameseOffTopicLabel(
        imageModeration.label,
      );
      const messages = {
        OFF_TOPIC_IMAGE: `Ảnh "${offTopicLabel}" không liên quan đến bài đăng cho thuê. Vui lòng thay bằng ảnh phòng, nhà hoặc tiện ích.`,
        ADULT_CONTENT:
          "Ảnh có nội dung người lớn, không thể đăng bài. Vui lòng thay ảnh.",
        SENSITIVE_CONTENT_SUSPECTED:
          "Ảnh có thể chứa nội dung nhạy cảm, không thể đăng bài. Vui lòng thay ảnh.",
        IMAGE_VERIFICATION_FAILED:
          "Không thể xác minh ảnh lúc này. Bài đăng chưa được tạo; vui lòng thử lại sau.",
        MANUAL_REVIEW_REQUIRED:
          "Không thể xác minh ảnh lúc này. Bài đăng chưa được tạo; vui lòng thử lại sau.",
      };
      const error = new Error(
        messages[category] ?? messages.MANUAL_REVIEW_REQUIRED,
      );
      error.statusCode = [
        "IMAGE_VERIFICATION_FAILED",
        "MANUAL_REVIEW_REQUIRED",
      ].includes(category)
        ? 503
        : 400;
      error.category = category;
      error.findings = imageModeration.findings ?? [{ category }];
      throw error;
    }

    const sql = `
      INSERT INTO posts (
        author_id, landmark_id, title, description, post_type, price, area, address_detail,
        province_code, district_code, ward_code, post_lat, post_lng,
        enable_booking, status, is_approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.user_id ?? data.author_id,
      data.landmark_id || null,
      data.title,
      data.description || null,
      data.post_type || data.type || "RENTAL",
      data.price || null,
      data.area ?? null,
      data.address || data.address_detail || "",
      data.province_code ?? null,
      data.district_code ?? null,
      data.ward_code ?? null,
      data.latitude ?? data.post_lat ?? null,
      data.longitude ?? data.post_lng ?? null,
      data.enable_booking ?? 1,
      "AVAILABLE",
      1,
    ];
    const storedImages = [];
    const uploadedImages = [];
    const cloudinary = require("../services/cloudinary.service");
    let connection;
    try {
      for (const imageUrl of payloadImages) {
        let storedUrl = imageUrl;
        const dataUri = imageUrl.match(
          /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/,
        );
        if (dataUri) {
          storedUrl = await cloudinary.uploadBase64Image(imageUrl, "posts");
          uploadedImages.push(storedUrl);
        } else if (imageUrl.startsWith("data:")) {
          throw invalidPostInput("Định dạng ảnh không được hỗ trợ.");
        }
        storedImages.push(storedUrl);
      }

      connection = await db.getConnection();
      await connection.beginTransaction();
      const [result] = await connection.query(sql, values);
      for (const [index, imageUrl] of storedImages.entries()) {
        await connection.query(
          "INSERT INTO post_images (post_id, image_url, is_cover) VALUES (?, ?, ?)",
          [result.insertId, imageUrl, index === 0 ? 1 : 0],
        );
      }
      await connection.commit();
      return { post_id: result.insertId, ...data, images: storedImages };
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }
      await Promise.allSettled(
        uploadedImages.map((imageUrl) => cloudinary.deleteImageByUrl(imageUrl)),
      );
      throw error;
    } finally {
      connection?.release();
    }
  }

  static async update(id, updateData) {
    const aliases = {
      user_id: "author_id",
      type: "post_type",
      address: "address_detail",
      latitude: "post_lat",
      longitude: "post_lng",
    };
    updateData = Object.fromEntries(
      Object.entries(updateData).map(([key, value]) => [
        aliases[key] || key,
        value,
      ]),
    );
    const allowedFields = [
      "author_id",
      "landmark_id",
      "title",
      "description",
      "price",
      "address_detail",
      "province_code",
      "district_code",
      "ward_code",
      "post_lat",
      "post_lng",
      "status",
      "post_type",
      "enable_booking",
    ];

    const fieldsToUpdate = [];
    const values = [];

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        fieldsToUpdate.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fieldsToUpdate.length === 0) return true;

    values.push(id);
    const sql = `UPDATE posts SET ${fieldsToUpdate.join(", ")} WHERE post_id = ?`;
    const [result] = await db.query(sql, values);
    return result.affectedRows > 0;
  }

  static async updateOwned(id, authorId, updateData) {
    const aliases = {
      address: "address_detail",
    };
    const normalized = Object.fromEntries(
      Object.entries(updateData).map(([key, value]) => [
        aliases[key] || key,
        value,
      ]),
    );
    const allowedFields = ["title", "description", "price", "address_detail"];
    const entries = Object.entries(normalized).filter(([key]) =>
      allowedFields.includes(key),
    );
    if (!entries.length) return false;
    const assignments = entries.map(([key]) => `${key} = ?`).join(", ");
    const [result] = await db.query(
      `UPDATE posts SET ${assignments}, is_approved = 0 WHERE post_id = ? AND author_id = ?`,
      [...entries.map(([, value]) => value), id, authorId],
    );
    return result.affectedRows > 0;
  }

  static async setVisibility(id, authorId, status) {
    const [result] = await db.query(
      "UPDATE posts SET status = ? WHERE post_id = ? AND author_id = ? AND status IN ('AVAILABLE', 'HIDDEN')",
      [status, id, authorId],
    );
    return result.affectedRows > 0;
  }

  static async deleteOwned(id, authorId) {
    const [result] = await db.query(
      "DELETE FROM posts WHERE post_id = ? AND author_id = ?",
      [id, authorId],
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.query("DELETE FROM posts WHERE post_id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  }

  static async getNearbyByLandmark(landmarkId, radiusKm = 10) {
    if (!landmarkId) return [];

    const [landmarkRows] = await db.query(
      "SELECT latitude, longitude FROM landmarks WHERE landmark_id = ?",
      [landmarkId],
    );

    const landmark = landmarkRows[0];
    if (!landmark) return [];

    const [rows] = await db.query(`
      SELECT p.*, (SELECT GROUP_CONCAT(image_url ORDER BY is_cover DESC, image_id SEPARATOR '||') FROM post_images WHERE post_id = p.post_id) AS image_urls, p.author_id AS user_id, p.post_type AS type, p.address_detail AS address, p.post_lat AS latitude, p.post_lng AS longitude, (SELECT image_url FROM post_images pi WHERE pi.post_id = p.post_id ORDER BY pi.is_cover DESC, pi.image_id LIMIT 1) AS image_url, u.full_name as author_name, u.avatar_url, u.is_verified, u.is_vip, u.vip_expires_at,
             CASE WHEN COALESCE(u.is_vip, 0) = 1 AND (u.vip_expires_at IS NULL OR u.vip_expires_at > NOW()) THEN 1 ELSE 0 END AS is_vip_active,
             CASE WHEN COALESCE(u.is_verified, 0) = 1 THEN 1 ELSE 0 END AS is_verified_active
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.user_id
      WHERE p.post_lat IS NOT NULL AND p.post_lng IS NOT NULL AND p.status = 'AVAILABLE' AND p.is_approved = 1
    `);

    return rows
      .map((post) => {
        const exactDistanceKm = this.calculateDistanceKm(
          Number(landmark.latitude),
          Number(landmark.longitude),
          Number(post.post_lat),
          Number(post.post_lng),
        );
        return {
          ...post,
          exact_distance_km: exactDistanceKm,
          distance_km: Number(exactDistanceKm.toFixed(1)),
        };
      })
      .filter((post) => post.exact_distance_km <= Number(radiusKm))
      .map(({ exact_distance_km, ...post }) => post)
      .sort((a, b) => {
        if (Number(b.is_vip_active) !== Number(a.is_vip_active)) {
          return Number(b.is_vip_active) - Number(a.is_vip_active);
        }
        if (Number(b.is_verified_active) !== Number(a.is_verified_active)) {
          return Number(b.is_verified_active) - Number(a.is_verified_active);
        }
        return a.distance_km - b.distance_km;
      });
  }

  static async search({
    provinceCode,
    districtCode,
    wardCode,
    landmarkId,
    keyword = "",
    radiusKm = 10,
    page = 1,
    limit = getHomePageLimit(),
  } = {}) {
    const conditions = ["p.status = 'AVAILABLE'", "p.is_approved = 1"];
    const values = [];

    if (provinceCode != null) {
      conditions.push("p.province_code = ?");
      values.push(provinceCode);
    }
    if (districtCode != null) {
      conditions.push("p.district_code = ?");
      values.push(districtCode);
    }
    if (wardCode != null) {
      conditions.push("p.ward_code = ?");
      values.push(wardCode);
    }
    const keywordFilter = buildKeywordConditions(keyword);
    conditions.push(...keywordFilter.conditions);
    values.push(...keywordFilter.values);

    let landmark = null;
    if (landmarkId != null) {
      const [landmarkRows] = await db.query(
        "SELECT latitude, longitude FROM landmarks WHERE landmark_id = ?",
        [landmarkId],
      );
      landmark = landmarkRows[0] || null;
      if (!landmark) return [];
      conditions.push("p.post_lat IS NOT NULL AND p.post_lng IS NOT NULL");
    }

    const sql = `
      SELECT p.*, (SELECT GROUP_CONCAT(image_url ORDER BY is_cover DESC, image_id SEPARATOR '||') FROM post_images WHERE post_id = p.post_id) AS image_urls, p.author_id AS user_id, p.post_type AS type, p.address_detail AS address, p.post_lat AS latitude, p.post_lng AS longitude, (SELECT image_url FROM post_images pi WHERE pi.post_id = p.post_id ORDER BY pi.is_cover DESC, pi.image_id LIMIT 1) AS image_url, u.full_name as author_name, u.avatar_url, u.is_verified, u.is_vip, u.vip_expires_at,
             CASE WHEN COALESCE(u.is_vip, 0) = 1 AND (u.vip_expires_at IS NULL OR u.vip_expires_at > NOW()) THEN 1 ELSE 0 END AS is_vip_active,
             CASE WHEN COALESCE(u.is_verified, 0) = 1 THEN 1 ELSE 0 END AS is_verified_active
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.user_id
      LEFT JOIN landmarks l ON p.landmark_id = l.landmark_id
      WHERE ${conditions.join(" AND ")}
    `;
    const [rows] = await db.query(sql, values);

    const results = landmark
      ? rows
          .map((post) => {
            const exactDistanceKm = this.calculateDistanceKm(
              Number(landmark.latitude),
              Number(landmark.longitude),
              Number(post.post_lat),
              Number(post.post_lng),
            );
            return {
              ...post,
              exact_distance_km: exactDistanceKm,
              distance_km: Number(exactDistanceKm.toFixed(1)),
            };
          })
          .filter(
            (post) =>
              radiusKm == null || post.exact_distance_km <= Number(radiusKm),
          )
          .map(({ exact_distance_km, ...post }) => post)
      : rows;

    const orderedResults = sortRecommendedPosts(results, {
      userArea: landmark ? null : null,
    });
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(
      Math.max(1, Number.parseInt(limit, 10) || getHomePageLimit()),
      50,
    );
    const offset = (pageNumber - 1) * pageSize;

    return {
      items: orderedResults.slice(offset, offset + pageSize),
      page: pageNumber,
      limit: pageSize,
      total: orderedResults.length,
      hasMore: offset + pageSize < orderedResults.length,
    };
  }

  static async getDistanceToPost({ postId, landmarkId }) {
    const post = await this.getById(postId);
    if (!post) return null;

    const [landmarkRows] = await db.query(
      "SELECT latitude, longitude FROM landmarks WHERE landmark_id = ?",
      [landmarkId],
    );

    const landmark = landmarkRows[0];
    if (!landmark) return null;

    const distanceKm = this.calculateDistanceKm(
      Number(landmark.latitude),
      Number(landmark.longitude),
      Number(post.latitude),
      Number(post.longitude),
    );

    return {
      post_id: post.post_id,
      landmark_id: landmarkId,
      distance_km: distanceKm,
      distance_label: `${distanceKm.toFixed(1)} km`,
      post,
    };
  }

  static async isAreaPromotionVipActive(authorId) {
    const [rows] = await db.query(
      `SELECT 1
       FROM users u
       JOIN subscriptions s ON s.user_id = u.user_id
       WHERE u.user_id = ?
         AND u.is_vip = 1
         AND (u.vip_expires_at IS NULL OR u.vip_expires_at > NOW())
         AND s.package_name IN ('VIP_3_MONTHS', 'VIP_1_YEAR')
         AND s.status = 'ACTIVE'
         AND s.start_date <= NOW()
         AND s.end_date > NOW()
       LIMIT 1`,
      [authorId],
    );
    return rows.length > 0;
  }

  static async getNearbyFinders({
    latitude,
    longitude,
    authorId,
    radiusKm = 10,
  }) {
    const distance = `6371 * ACOS(LEAST(1, GREATEST(-1,
      COS(RADIANS(?)) * COS(RADIANS(COALESCE(l.latitude, p.post_lat))) *
      COS(RADIANS(COALESCE(l.longitude, p.post_lng)) - RADIANS(?)) +
      SIN(RADIANS(?)) * SIN(RADIANS(COALESCE(l.latitude, p.post_lat)))
    )))`;
    const [rows] = await db.query(
      `SELECT u.user_id, MIN(${distance}) AS distance_km
       FROM posts p
       JOIN users u ON u.user_id = p.author_id
       LEFT JOIN landmarks l ON l.landmark_id = p.landmark_id
       WHERE p.post_type = 'FIND'
         AND p.status = 'AVAILABLE'
         AND p.is_approved = 1
         AND u.status = 'ACTIVE'
         AND p.author_id <> ?
         AND COALESCE(l.latitude, p.post_lat) IS NOT NULL
         AND COALESCE(l.longitude, p.post_lng) IS NOT NULL
      GROUP BY u.user_id
       HAVING distance_km < ?
       ORDER BY distance_km ASC
       LIMIT 250`,
      [latitude, longitude, latitude, authorId, radiusKm],
    );
    return rows;
  }
}

module.exports = postsRepository;
