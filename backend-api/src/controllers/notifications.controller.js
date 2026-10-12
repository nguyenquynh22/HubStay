const Repo = require("../repositories/notifications.repository");
const {
  normalizeNotificationIds,
} = require("../lib/notification-selection-policy");

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

module.exports = {
  getByUser: async (req, res, next) => {
    try {
      const userId = parseId(req.params.userId);
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "userId không hợp lệ" });
      if (userId !== res.locals.user.userId)
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ được xem thông báo của mình.",
        });
      const data = await Repo.getByUserId(userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  markRead: async (req, res, next) => {
    try {
      const userId = res.locals.user.userId;
      const notificationId = parseId(req.params.id);
      if (!notificationId)
        return res
          .status(400)
          .json({ success: false, message: "ID không hợp lệ" });
      const updated = await Repo.markRead(userId, notificationId);
      if (!updated)
        return res
          .status(404)
          .json({ success: false, message: "Thông báo không tồn tại" });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  markAllRead: async (req, res, next) => {
    try {
      const userId = parseId(req.params.userId);
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "userId không hợp lệ" });
      if (userId !== res.locals.user.userId)
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ được cập nhật thông báo của mình.",
        });
      await Repo.markAllRead(userId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  deleteAll: async (req, res, next) => {
    try {
      const userId = parseId(req.params.userId);
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "userId không hợp lệ" });
      if (userId !== res.locals.user.userId)
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ được xóa thông báo của mình.",
        });
      const deletedCount = await Repo.deleteAll(userId);
      res.json({ success: true, data: { deleted_count: deletedCount } });
    } catch (err) {
      next(err);
    }
  },

  deleteOne: async (req, res, next) => {
    try {
      const notificationId = parseId(req.params.id);
      if (!notificationId) {
        return res
          .status(400)
          .json({ success: false, message: "Thông báo không hợp lệ." });
      }
      const deleted = await Repo.deleteOne(
        res.locals.user.userId,
        notificationId,
      );
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy thông báo." });
      }
      return res.json({ success: true, data: { deleted_count: 1 } });
    } catch (err) {
      next(err);
    }
  },

  deleteSelected: async (req, res, next) => {
    try {
      const userId = parseId(req.params.userId);
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, message: "Tài khoản không hợp lệ." });
      }
      if (userId !== res.locals.user.userId) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ được xóa thông báo của mình.",
        });
      }
      const notificationIds = normalizeNotificationIds(
        req.body?.notification_ids,
      );
      if (!notificationIds) {
        return res.status(400).json({
          success: false,
          message: "Hãy chọn từ 1 đến 50 thông báo hợp lệ để xóa.",
        });
      }
      const deletedCount = await Repo.deleteSelected(userId, notificationIds);
      return res.json({ success: true, data: { deleted_count: deletedCount } });
    } catch (err) {
      next(err);
    }
  },
};
