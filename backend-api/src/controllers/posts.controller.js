const Repo = require("../repositories/posts.repository");
const Notifications = require("../services/notifications.service");
const ContentModeration = require("../services/content_moderation.service");

module.exports = {
  getAll: async (req, res, next) => {
    try {
      const data = await Repo.getAll();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req, res, next) => {
    try {
      const item = await Repo.getById(req.params.id);
      if (!item)
        return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  getByAuthor: async (req, res, next) => {
    try {
      const authorId = req.params.userId;
      const order = req.query.sort === "oldest" ? "ASC" : "DESC";
      const data = await Repo.getByAuthorId(authorId, order);
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

      const data = await Repo.search({
        provinceCode,
        districtCode,
        wardCode,
        landmarkId,
        radiusKm,
      });
      res.json({
        success: true,
        data,
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
      const newItem = await Repo.create(req.body);
      await Notifications.notify(
        Number(req.body.user_id ?? req.body.author_id),
        "POST_APPROVED",
        "Tin đăng đã được duyệt",
        "Tin đăng của bạn đã được xuất bản.",
        { post_id: newItem.post_id },
      );
      res.status(201).json({
        success: true,
        message: "Created successfully",
        data: newItem,
      });
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const updated = await Repo.update(req.params.id, req.body);
      res.json({
        success: true,
        message: "Updated successfully",
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const success = await Repo.delete(req.params.id);
      if (!success)
        return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
      next(err);
    }
  },
};
