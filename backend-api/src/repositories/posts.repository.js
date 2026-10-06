const db = require("../common/db");

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

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
      WHERE p.post_id = ?
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
    const sql = `
      INSERT INTO posts (
        author_id, landmark_id, title, description, post_type, price, area, address_detail,
        province_code, district_code, ward_code, post_lat, post_lng,
        enable_booking, status, is_approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', 1)
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
    ];

    const payloadImages = Array.isArray(data.images)
      ? data.images.filter(Boolean)
      : [];
    if (payloadImages.length > 6) {
      throw new Error("Mỗi bài đăng chỉ được tải tối đa 6 ảnh.");
    }
    let totalImageBytes = 0;
    for (const imageUrl of payloadImages) {
      if (typeof imageUrl !== "string") {
        throw new Error("Định dạng ảnh không hợp lệ.");
      }
      const dataUri = imageUrl.match(
        /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/,
      );
      if (imageUrl.startsWith("data:") && !dataUri) {
        throw new Error(
          "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP; video không được hỗ trợ.",
        );
      }
      if (dataUri) {
        const imageBytes = Buffer.from(dataUri[2], "base64").length;
        if (!imageBytes || imageBytes > 8 * 1024 * 1024) {
          throw new Error("Mỗi ảnh không được vượt quá 8 MB.");
        }
        totalImageBytes += imageBytes;
      } else if (/\.(mp4|mov|m4v|webm|avi)(?:[?#].*)?$/i.test(imageUrl)) {
        throw new Error("Video không được hỗ trợ trong bài đăng.");
      }
    }
    if (totalImageBytes > 30 * 1024 * 1024) {
      throw new Error("Tổng dung lượng ảnh không được vượt quá 30 MB.");
    }

    const [result] = await db.query(sql, values);
    const storedImages = [];
    if (Array.isArray(data.images)) {
      for (const [index, imageUrl] of data.images.entries()) {
        if (!imageUrl) continue;
        let storedUrl = imageUrl;
        const dataUri =
          typeof imageUrl === "string" &&
          imageUrl.match(
            /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/,
          );
        if (dataUri) {
          const extension = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
          }[dataUri[1]];
          const buffer = Buffer.from(dataUri[2], "base64");
          if (!buffer.length || buffer.length > 8 * 1024 * 1024)
            throw new Error("Image is invalid or larger than 8 MB.");
          const filename = `${crypto.randomUUID()}.${extension}`;
          const directory = path.join(__dirname, "../../uploads/posts");
          await fs.mkdir(directory, { recursive: true });
          await fs.writeFile(path.join(directory, filename), buffer, {
            flag: "wx",
          });
          storedUrl = `/uploads/posts/${filename}`;
        } else if (
          typeof imageUrl !== "string" ||
          imageUrl.startsWith("data:")
        ) {
          throw new Error("Unsupported image format.");
        }
        await db.query(
          "INSERT INTO post_images (post_id, image_url, is_cover) VALUES (?, ?, ?)",
          [result.insertId, storedUrl, index === 0 ? 1 : 0],
        );
        storedImages.push(storedUrl);
      }
    }
    return { post_id: result.insertId, ...data, images: storedImages };
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
    radiusKm = 10,
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
            (post) => radiusKm == null || post.exact_distance_km <= Number(radiusKm),
          )
          .map(({ exact_distance_km, ...post }) => post)
      : rows;

    return results.sort((a, b) => {
      if (Number(b.is_vip_active) !== Number(a.is_vip_active)) {
        return Number(b.is_vip_active) - Number(a.is_vip_active);
      }
      if (Number(b.is_verified_active) !== Number(a.is_verified_active)) {
        return Number(b.is_verified_active) - Number(a.is_verified_active);
      }
      if (landmark) return a.distance_km - b.distance_km;
      return new Date(b.created_at) - new Date(a.created_at);
    });
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
}

module.exports = postsRepository;
