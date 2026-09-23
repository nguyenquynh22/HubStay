const Repo = require("../repositories/subscriptions.repository");
const UsersRepo = require("../repositories/users.repository");

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
      if (!item) return res.status(404).json({ success: false, message: "Gói đăng ký không tồn tại" });
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  getByUser: async (req, res, next) => {
    try {
      const data = await Repo.getByUserId(req.params.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const { user_id, package_name, price, start_date, end_date } = req.body;

      if (!user_id || !package_name || !price || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập đầy đủ user_id, package_name, price, start_date và end_date",
        });
      }

      const newSub = await Repo.create({
        user_id,
        package_name,
        price,
        start_date,
        end_date,
        status: "ACTIVE",
      });

      // Tự động cập nhật VIP cho User
      await UsersRepo.update(user_id, {
        is_vip: 1,
        vip_expires_at: end_date,
      });

      res.status(201).json({
        success: true,
        message: "Kích hoạt gói VIP thành công",
        data: newSub,
      });
    } catch (err) {
      next(err);
    }
  },

  updateStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      const validStatuses = ["ACTIVE", "EXPIRED", "CANCELLED"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
      }

      const success = await Repo.updateStatus(req.params.id, status);
      if (!success) return res.status(404).json({ success: false, message: "Gói đăng ký không tồn tại" });

      res.json({ success: true, message: "Cập nhật trạng thái thành công" });
    } catch (err) {
      next(err);
    }
  },
};