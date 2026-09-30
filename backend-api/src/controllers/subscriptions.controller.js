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
      if (!item)
        return res
          .status(404)
          .json({ success: false, message: "Gói đăng ký không tồn tại" });
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
          message:
            "Vui lòng nhập đầy đủ user_id, package_name, price, start_date và end_date",
        });
      }

      const currentUser = await UsersRepo.getById(user_id);
      if (!currentUser) {
        return res
          .status(404)
          .json({ success: false, message: "Người dùng không tồn tại" });
      }

      // KYC / xác thực tài khoản là điều kiện bắt buộc trước khi đăng ký VIP
      if (Number(currentUser.is_verified) !== 1) {
        return res.status(403).json({
          success: false,
          message:
            "Bạn cần xác thực KYC trước khi kích hoạt gói VIP cho chủ trọ.",
          required_action: "VERIFY_KYC",
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
        message:
          "Kích hoạt gói VIP thành công. Bài đăng của bạn sẽ được ưu tiên hiển thị hơn.",
        data: newSub,
      });
    } catch (err) {
      next(err);
    }
  },

  activateDev: async (req, res, next) => {
    try {
      if (process.env.NODE_ENV === "production") return res.status(403).json({ success: false, message: "Kích hoạt VIP miễn phí chỉ có trong môi trường phát triển" });
      const { user_id, package_name, months } = req.body;
      const duration = Number(months);
      if (!user_id || ![1, 12].includes(duration)) return res.status(400).json({ success: false, message: "Chọn gói 1 tháng hoặc 1 năm" });
      const user = await UsersRepo.getById(user_id);
      if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
      if (Number(user.is_verified) !== 1) return res.status(403).json({ success: false, required_action: "VERIFY", message: "Cần xác thực tài khoản trước khi đăng ký VIP" });
      if (user.role !== "LANDLORD") return res.status(403).json({ success: false, message: "Gói VIP dành cho chủ trọ" });
      const start = new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + duration);
      const subscription = await Repo.create({ user_id, package_name: package_name || `VIP_${duration === 1 ? "1_MONTH" : "1_YEAR"}`, price: 0, start_date: start, end_date: end, status: "ACTIVE" });
      await UsersRepo.update(user_id, { is_vip: 1, vip_expires_at: end });
      res.status(201).json({ success: true, message: "Đã kích hoạt VIP miễn phí ở chế độ phát triển", data: subscription });
    } catch (err) { next(err); }
  },

  updateStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      const validStatuses = ["ACTIVE", "EXPIRED", "CANCELLED"];
      if (!status || !validStatuses.includes(status)) {
        return res
          .status(400)
          .json({ success: false, message: "Trạng thái không hợp lệ" });
      }

      const success = await Repo.updateStatus(req.params.id, status);
      if (!success)
        return res
          .status(404)
          .json({ success: false, message: "Gói đăng ký không tồn tại" });

      res.json({ success: true, message: "Cập nhật trạng thái thành công" });
    } catch (err) {
      next(err);
    }
  },
};
