const Repo = require("../repositories/subscriptions.repository");
const UsersRepo = require("../repositories/users.repository");
const VipPackagesRepository = require("../repositories/vip_packages.repository");
const crypto = require("crypto");
const Notifications = require("../services/notifications.service");

const getPackages = async () => {
  const packages = await VipPackagesRepository.findActive();
  return packages.map((item) => ({
    package_id: item.package_id,
    package_name: item.package_name,
    display_name: item.display_name,
    description: item.description,
    benefits: item.benefits,
    months: Math.max(1, Math.round(item.duration_days / 30)),
    duration_days: Number(item.duration_days),
    price: Number(item.price),
    is_active: Number(item.is_active) === 1,
  }));
};

module.exports = {
  getPackages: async (req, res) => {
    res.json({ success: true, data: await getPackages() });
  },

  purchase: async (req, res, next) => {
    try {
      const user_id = Number(req.body.user_id);
      const selectedPackage = (await getPackages()).find(
        (item) => item.package_name === req.body.package_name,
      );
      if (
        !Number.isInteger(user_id) ||
        user_id < 1 ||
        !selectedPackage ||
        selectedPackage.price <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Gói VIP chưa hợp lệ hoặc chưa cấu hình giá",
        });
      }
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + selectedPackage.duration_days);
      const result = await Repo.purchaseWithWallet({
        user_id,
        ...selectedPackage,
        months: selectedPackage.months,
        end_date: endDate,
        transaction_code: `VIP-${crypto.randomUUID()}`,
      });
      if (result.error) {
        const errors = {
          USER_NOT_FOUND: [404, "Người dùng không tồn tại"],
          LANDLORD_ONLY: [403, "Gói VIP dành cho chủ trọ"],
          KYC_REQUIRED: [403, "Bạn cần xác thực KYC trước khi mua gói VIP."],
          INSUFFICIENT_BALANCE: [409, "Số dư ví không đủ để mua gói VIP."],
        };
        const [status, message] = errors[result.error] || [
          400,
          "Không thể mua gói VIP",
        ];
        return res.status(status).json({
          success: false,
          message,
          required_action:
            result.error === "KYC_REQUIRED" ? "VERIFY_KYC" : undefined,
        });
      }
      await Notifications.notify(
        user_id,
        "VIP_PURCHASE_SUCCESS",
        "Đăng ký VIP thành công",
        `${selectedPackage.display_name} đã được kích hoạt. Bạn sẽ nhận: ${selectedPackage.benefits.join("; ") || "ưu tiên hiển thị"}.`,
        { subscription_id: result.subscription_id },
      );
      res.status(201).json({
        success: true,
        message: "Mua gói VIP thành công",
        data: result,
      });
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
    return res.status(410).json({
      success: false,
      message: "Hãy sử dụng /subscriptions/purchase để thanh toán qua số dư ví",
    });
  },

  activateDev: async (req, res, next) => {
    try {
      if (process.env.NODE_ENV === "production")
        return res.status(403).json({
          success: false,
          message: "Kích hoạt VIP miễn phí chỉ có trong môi trường phát triển",
        });
      const { user_id, package_name, months } = req.body;
      const duration = Number(months);
      if (!user_id || ![1, 12].includes(duration))
        return res
          .status(400)
          .json({ success: false, message: "Chọn gói 1 tháng hoặc 1 năm" });
      const user = await UsersRepo.getById(user_id);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "Người dùng không tồn tại" });
      if (Number(user.is_verified) !== 1)
        return res.status(403).json({
          success: false,
          required_action: "VERIFY",
          message: "Cần xác thực tài khoản trước khi đăng ký VIP",
        });
      if (user.role !== "LANDLORD")
        return res
          .status(403)
          .json({ success: false, message: "Gói VIP dành cho chủ trọ" });
      const start = new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + duration);
      const subscription = await Repo.create({
        user_id,
        package_name:
          package_name || `VIP_${duration === 1 ? "1_MONTH" : "1_YEAR"}`,
        price: 0,
        start_date: start,
        end_date: end,
        status: "ACTIVE",
      });
      await UsersRepo.update(user_id, { is_vip: 1, vip_expires_at: end });
      res.status(201).json({
        success: true,
        message: "Đã kích hoạt VIP miễn phí ở chế độ phát triển",
        data: subscription,
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
