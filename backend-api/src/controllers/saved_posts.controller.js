const Repo = require("../repositories/saved_posts.repository");

module.exports = {
  getAll: async (req, res, next) => {
    try {
      const data = await Repo.getAll();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getByUser: async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      if (userId !== res.locals.user.userId)
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể xem danh sách yêu thích của mình.",
        });
      res.json({ success: true, data: await Repo.getByUserId(userId) });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const userId = res.locals.user.userId;
      const postId = Number(req.body.post_id);
      if (!Number.isInteger(postId) || postId < 1)
        return res.status(400).json({
          success: false,
          message: "post_id không hợp lệ",
        });
      if (req.body.user_id && Number(req.body.user_id) !== userId)
        return res.status(403).json({
          success: false,
          message: "Không thể lưu bài đăng thay cho tài khoản khác.",
        });
      const result = await Repo.toggle(userId, postId);
      if (result.error) {
        const status = result.error === "POST_NOT_FOUND" ? 404 : 409;
        const message = {
          POST_NOT_FOUND: "Không tìm thấy bài đăng.",
          OWN_POST: "Bạn không thể lưu bài đăng của chính mình.",
          POST_UNAVAILABLE: "Bài đăng hiện không khả dụng để lưu.",
        }[result.error];
        return res.status(status).json({ success: false, message });
      }
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
