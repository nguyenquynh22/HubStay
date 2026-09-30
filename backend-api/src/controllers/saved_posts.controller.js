const Repo = require('../repositories/saved_posts.repository');

module.exports = {
  getAll: async (req, res, next) => {
    try {
      const data = await Repo.getAll();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  getByUser: async (req, res, next) => {
    try { res.json({ success: true, data: await Repo.getByUserId(req.params.userId) }); }
    catch (err) { next(err); }
  },

  create: async (req, res, next) => {
    try {
      const { user_id, post_id } = req.body;
      if (!user_id || !post_id) return res.status(400).json({ success: false, message: "user_id và post_id là bắt buộc" });
      const result = await Repo.toggle(user_id, post_id);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

};
