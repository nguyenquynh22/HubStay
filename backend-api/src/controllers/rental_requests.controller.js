const Repo = require("../repositories/rental_requests.repository");

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
      if (!item) return res.status(404).json({ success: false, message: "Yêu cầu không tồn tại" });
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  getByPost: async (req, res, next) => {
    try {
      const data = await Repo.getByPostId(req.params.postId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const { post_id, tenant_id, note, status } = req.body;
      if (!post_id) {
        return res.status(400).json({ success: false, message: "Vui lòng cung cấp post_id" });
      }

      const newItem = await Repo.create({ post_id, tenant_id, note, status });
      res.status(201).json({
        success: true,
        message: "Tạo yêu cầu thuê thành công",
        data: newItem,
      });
    } catch (err) {
      next(err);
    }
  },

  updateStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      const validStatuses = ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
      }

      const success = await Repo.updateStatus(req.params.id, status);
      if (!success) return res.status(404).json({ success: false, message: "Yêu cầu không tồn tại" });

      res.json({ success: true, message: "Cập nhật trạng thái thành công" });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const success = await Repo.delete(req.params.id);
      if (!success) return res.status(404).json({ success: false, message: "Yêu cầu không tồn tại" });
      res.json({ success: true, message: "Xóa yêu cầu thành công" });
    } catch (err) {
      next(err);
    }
  },
};