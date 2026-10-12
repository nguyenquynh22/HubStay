const Repo = require("../repositories/posts.repository");
const UsersRepo = require("../repositories/users.repository");
const Notifications = require("../services/notifications.service");
const ContentModeration = require("../services/content_moderation.service");
const { validatePostTypeForRole } = require("../lib/post-permissions");

module.exports = {
  getById: async (req, res, next) => {
    try {
      const post = await Repo.getById(req.params.id);
      if (
        !post ||
        post.status !== "AVAILABLE" ||
        Number(post.is_approved) !== 1
      ) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bài đăng đang hiển thị",
        });
      }
      return res.json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  },

  getByAuthor: async (req, res, next) => {
    try {
      const authorId = Number(req.params.userId);
      if (authorId !== res.locals.user.userId) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể xem danh sách bài đăng của chính mình.",
        });
      }
      const sortOrder = req.query.sort === "oldest" ? "ASC" : "DESC";
      const data = await Repo.getByAuthorId(authorId, sortOrder);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getAll: async (req, res, next) => {
    try {
      const data = await Repo.getAll();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getNearbyByLandmark: async (req, res, next) => {
    try {
      const landmarkId = Number(
        req.query.landmark_id ?? req.query.landmarkId ?? req.params.landmarkId,
      );
      const radiusKm = Number(req.query.radius_km ?? req.query.radius ?? 10);

      if (!landmarkId) {
        return res
          .status(400)
          .json({ success: false, message: "Vui lòng cung cấp landmark_id" });
      }

      const data = await Repo.getNearbyByLandmark(landmarkId, radiusKm);
      res.json({
        success: true,
        data,
        center: { landmark_id: landmarkId },
        radius_km: radiusKm,
      });
    } catch (err) {
      next(err);
    }
  },

  search: async (req, res, next) => {
    try {
      const parseCode = (value) => {
        if (value == null || value === "") return null;
        const code = Number(value);
        return Number.isInteger(code) && code > 0 ? code : NaN;
      };
      const provinceCode = parseCode(req.query.province_code);
      const districtCode = parseCode(req.query.district_code);
      const wardCode = parseCode(req.query.ward_code);
      const landmarkId = parseCode(req.query.landmark_id);
      const keyword =
        typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";
      if (
        req.query.keyword !== undefined &&
        typeof req.query.keyword !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Từ khóa tìm kiếm không hợp lệ",
        });
      }
      if (keyword.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Từ khóa tìm kiếm không được vượt quá 100 ký tự",
        });
      }
      const invalidCodes = [
        provinceCode,
        districtCode,
        wardCode,
        landmarkId,
      ].some((code) => Number.isNaN(code));

      if (invalidCodes) {
        return res.status(400).json({
          success: false,
          message: "Mã khu vực hoặc landmark không hợp lệ",
        });
      }
      if (wardCode != null && (districtCode == null || provinceCode == null)) {
        return res.status(400).json({
          success: false,
          message: "Tìm theo xã cần province_code và district_code",
        });
      }
      if (districtCode != null && provinceCode == null) {
        return res.status(400).json({
          success: false,
          message: "Tìm theo huyện cần province_code",
        });
      }

      const radiusKm =
        req.query.radius_km === "all"
          ? null
          : Number(req.query.radius_km ?? 10);
      if (
        landmarkId != null &&
        radiusKm != null &&
        ![5, 10, 20, 30].includes(radiusKm)
      ) {
        return res.status(400).json({
          success: false,
          message: "Bán kính phải là 5, 10, 20 hoặc 30 km",
        });
      }
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        50,
        Math.max(1, Number.parseInt(req.query.limit, 10) || 5),
      );

      const data = await Repo.search({
        provinceCode,
        districtCode,
        wardCode,
        landmarkId,
        keyword,
        radiusKm,
        page,
        limit,
      });
      res.json({
        success: true,
        data: data.items,
        pagination: {
          page: data.page,
          limit: data.limit,
          total: data.total,
          hasMore: data.hasMore,
        },
        radius_km: landmarkId ? radiusKm : null,
      });
    } catch (err) {
      next(err);
    }
  },

  getDistanceToPost: async (req, res, next) => {
    try {
      const landmarkId = Number(
        req.query.landmark_id ?? req.query.landmarkId ?? req.body?.landmark_id,
      );
      const postId = Number(
        req.params.postId ??
          req.params.id ??
          req.query.post_id ??
          req.body?.post_id,
      );

      if (!landmarkId || !postId) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp landmark_id và postId",
        });
      }

      const distance = await Repo.getDistanceToPost({ postId, landmarkId });
      if (!distance) {
        return res.status(404).json({ success: false, message: "Not found" });
      }

      res.json({ success: true, data: distance });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const userId = Number(res.locals.user?.userId ?? res.locals.userId);
      if (!Number.isInteger(userId) || userId < 1) {
        return res.status(401).json({
          success: false,
          message: "Người dùng không hợp lệ hoặc chưa đăng nhập.",
        });
      }
      const requestedUserId = req.body.user_id ?? req.body.author_id;
      if (requestedUserId != null && Number(requestedUserId) !== userId) {
        return res.status(403).json({
          success: false,
          message: "Không thể đăng bài thay cho tài khoản khác.",
        });
      }
      const requestedPostType = req.body.post_type ?? req.body.type;
      const user = await UsersRepo.getById(userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Người dùng không hợp lệ hoặc chưa đăng nhập.",
        });
      }
      if (user.status === "BANNED") {
        return res.status(403).json({
          success: false,
          message: "Tài khoản đã bị khóa vĩnh viễn, không thể đăng bài.",
        });
      }
      if (user.banned_until && new Date(user.banned_until) > new Date()) {
        return res.status(403).json({
          success: false,
          message:
            "Tài khoản đang bị tạm khóa quyền đăng bài. Vui lòng thử lại sau thời hạn hạn chế.",
        });
      }
      if (!validatePostTypeForRole(user.role, requestedPostType)) {
        return res.status(403).json({
          success: false,
          message: `Vai trò ${user.role} không được đăng bài loại ${requestedPostType}.`,
        });
      }

      const title =
        typeof req.body.title === "string" ? req.body.title.trim() : "";
      const description =
        typeof req.body.description === "string"
          ? req.body.description.trim()
          : "";
      const price = Number(req.body.price);
      const images = Array.isArray(req.body.images) ? req.body.images : [];
      if (
        !title ||
        title.length > 200 ||
        !description ||
        !Number.isFinite(price) ||
        price <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Tiêu đề, mô tả và giá lớn hơn 0 là bắt buộc.",
        });
      }
      if (
        images.length > 6 ||
        (requestedPostType !== "FIND" && images.length < 2)
      ) {
        return res.status(400).json({
          success: false,
          message:
            requestedPostType === "FIND"
              ? "Mỗi bài đăng được tải tối đa 6 ảnh."
              : "Bài đăng cần tối thiểu 2 ảnh và không vượt quá 6 ảnh.",
        });
      }

      const blockedWord = ContentModeration.findBlockedWord(
        `${req.body.title || ""} ${req.body.description || ""}`,
      );
      if (blockedWord) {
        return res.status(400).json({
          success: false,
          message: `Tiêu đề hoặc mô tả chứa từ không phù hợp: "${blockedWord}".`,
        });
      }
      const areaCodes = [
        req.body.province_code,
        req.body.district_code,
        req.body.ward_code,
      ].map(Number);
      if (!areaCodes.every((code) => Number.isInteger(code) && code > 0)) {
        return res.status(400).json({
          success: false,
          message:
            "Vui lòng chọn đầy đủ tỉnh/thành phố, quận/huyện và phường/xã",
        });
      }
      const latitudeValue = req.body.latitude ?? req.body.post_lat;
      const longitudeValue = req.body.longitude ?? req.body.post_lng;
      const latitude = Number(latitudeValue);
      const longitude = Number(longitudeValue);
      if (
        latitudeValue == null ||
        longitudeValue == null ||
        latitudeValue === "" ||
        longitudeValue === "" ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Vui lòng cung cấp latitude/longitude hoặc post_lat/post_lng hợp lệ",
        });
      }
      const newItem = await Repo.create({
        ...req.body,
        user_id: userId,
        author_id: userId,
      });
      if (!newItem?.post_id) {
        throw new Error("Không thể xác nhận bài đăng đã được tạo.");
      }
      try {
        await Notifications.notify(
          userId,
          "POST_APPROVED",
          "Tin đăng đã được duyệt",
          "Tin đăng của bạn đã được xuất bản.",
          { post_id: newItem.post_id },
        );
      } catch (notificationError) {
        console.error(
          "Post created but notification failed:",
          notificationError.message,
        );
      }
      const authorId = userId;
      const postType = newItem.post_type ?? newItem.type;
      try {
        if (
          postType !== "FIND" &&
          Number.isFinite(Number(newItem.latitude ?? newItem.post_lat)) &&
          Number.isFinite(Number(newItem.longitude ?? newItem.post_lng)) &&
          (await Repo.isAreaPromotionVipActive(authorId))
        ) {
          const nearbyFinders = await Repo.getNearbyFinders({
            latitude: Number(newItem.latitude ?? newItem.post_lat),
            longitude: Number(newItem.longitude ?? newItem.post_lng),
            authorId,
          });
          await Promise.all(
            nearbyFinders.map((finder) =>
              Notifications.notify(
                finder.user_id,
                "NEARBY_VIP_POST",
                "Có phòng VIP gần địa điểm bạn ưu tiên",
                `${newItem.title} phù hợp với vị trí tìm trọ của bạn, cách khoảng ${Number(finder.distance_km).toFixed(1)} km.`,
                {
                  post_id: newItem.post_id,
                  distance_km: Number(finder.distance_km),
                },
              ),
            ),
          );
        }
      } catch (notificationError) {
        console.error(
          "Nearby VIP notifications failed:",
          notificationError.message,
        );
      }
      res.status(201).json({
        success: true,
        message: "Ảnh đã qua kiểm duyệt tự động và bài đăng đã được công khai.",
        data: newItem,
      });
    } catch (err) {
      if (err.code === "INVALID_POST_INPUT") {
        return res.status(400).json({ success: false, message: err.message });
      }
      if (err.category) {
        return res.status(err.statusCode ?? 400).json({
          success: false,
          message: err.message,
          category: err.category,
          findings: err.findings ?? [{ category: err.category }],
        });
      }
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const postId = Number(req.params.id);
      const updates = {};
      if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
        const title =
          typeof req.body.title === "string" ? req.body.title.trim() : "";
        if (!title || title.length > 200) {
          return res.status(400).json({
            success: false,
            message: "Tiêu đề phải có từ 1 đến 200 ký tự.",
          });
        }
        updates.title = title;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
        const description =
          typeof req.body.description === "string"
            ? req.body.description.trim()
            : "";
        if (!description) {
          return res.status(400).json({
            success: false,
            message: "Mô tả bài đăng không được để trống.",
          });
        }
        updates.description = description;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, "price")) {
        const price = Number(req.body.price);
        if (!Number.isFinite(price) || price <= 0) {
          return res.status(400).json({
            success: false,
            message: "Giá bài đăng phải lớn hơn 0.",
          });
        }
        updates.price = price;
      }
      if (!Object.keys(updates).length) {
        return res.status(400).json({
          success: false,
          message: "Không có nội dung hợp lệ để cập nhật.",
        });
      }
      const updated = await Repo.updateOwned(
        postId,
        res.locals.user.userId,
        updates,
      );
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bài đăng của bạn.",
        });
      }
      return res.json({
        success: true,
        message: "Cập nhật thành công. Bài đăng đang chờ Admin duyệt lại.",
        data: { post_id: postId, review_status: "PENDING" },
      });
    } catch (err) {
      next(err);
    }
  },

  setVisibility: async (req, res, next) => {
    try {
      const postId = Number(req.params.id);
      const status = req.body.status;
      if (
        !Number.isInteger(postId) ||
        postId < 1 ||
        !["AVAILABLE", "HIDDEN"].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái hiển thị không hợp lệ.",
        });
      }
      const updated = await Repo.setVisibility(
        postId,
        res.locals.user.userId,
        status,
      );
      if (!updated) {
        return res.status(409).json({
          success: false,
          message:
            "Không tìm thấy bài đăng của bạn hoặc bài đã ở trạng thái đã cho thuê.",
        });
      }
      return res.json({
        success: true,
        message:
          status === "HIDDEN" ? "Đã ẩn bài đăng." : "Đã hiển thị bài đăng.",
        data: { post_id: postId, status },
      });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const success = await Repo.deleteOwned(
        req.params.id,
        res.locals.user.userId,
      );
      if (!success)
        return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
      next(err);
    }
  },
};
