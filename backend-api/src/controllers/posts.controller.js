const Repo = require("../repositories/posts.repository");

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
      const data = await Repo.getByAuthorId(authorId);
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
      const newItem = await Repo.create(req.body);
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
