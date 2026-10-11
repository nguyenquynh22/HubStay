const Repo = require("../repositories/transactions.repository");
const crypto = require("crypto");
const Notifications = require("../services/notifications.service");

module.exports = {
  getAll: async (req, res, next) => {
    try {
      return res.status(403).json({
        success: false,
        message: "Không được phép xem giao dịch của tài khoản khác.",
      });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req, res, next) => {
    try {
      const item = await Repo.getById(req.params.id);
      if (!item || Number(item.user_id) !== res.locals.user.userId)
        return res
          .status(404)
          .json({ success: false, message: "Giao dịch không tồn tại" });
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  getByUser: async (req, res, next) => {
    try {
      if (Number(req.params.userId) !== res.locals.user.userId) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ được xem lịch sử giao dịch của mình.",
        });
      }
      const data = await Repo.getByUserId(res.locals.user.userId);
      res.json({
        success: true,
        data,
        mock_payment_enabled:
          process.env.NODE_ENV !== "production" &&
          process.env.ENABLE_MOCK_PAYMENTS === "true",
      });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const user_id = res.locals.user.userId;
      const amount = Number(req.body.amount);
      const mockPaymentEnabled =
        process.env.NODE_ENV !== "production" &&
        process.env.ENABLE_MOCK_PAYMENTS === "true";
      if (
        !Number.isInteger(user_id) ||
        user_id < 1 ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "user_id và số tiền nạp hợp lệ là bắt buộc",
        });
      }
      if (!mockPaymentEnabled) {
        return res.status(503).json({
          success: false,
          message:
            "Chưa cấu hình cổng thanh toán. Không tạo giao dịch chuyển khoản thật.",
        });
      }
      const transaction_code = `TOPUP-${crypto.randomUUID()}`;

      const newItem = await Repo.create({
        user_id,
        amount,
        payment_method: "MOCK_BANK",
        transaction_code,
        transaction_type: "TOP_UP",
        status: "PENDING",
      });

      res.status(201).json({
        success: true,
        message: "Tạo giao dịch thành công",
        data: newItem,
        mock_payment_enabled: mockPaymentEnabled,
      });
    } catch (err) {
      next(err);
    }
  },

  updateStatus: async (req, res, next) => {
    try {
      return res.status(403).json({
        success: false,
        message:
          "Trạng thái giao dịch chỉ được cập nhật qua cổng thanh toán hoặc quy trình quản trị có xác thực",
      });
    } catch (err) {
      next(err);
    }
  },

  simulateSuccess: async (req, res, next) => {
    try {
      if (
        process.env.NODE_ENV === "production" ||
        process.env.ENABLE_MOCK_PAYMENTS !== "true"
      ) {
        return res.status(403).json({
          success: false,
          message: "Mô phỏng thanh toán chưa được bật trên máy chủ phát triển.",
        });
      }
      const result = await Repo.completeTopUp(
        req.params.id,
        res.locals.user.userId,
      );
      if (result.error) {
        const status =
          result.error === "TRANSACTION_NOT_FOUND"
            ? 404
            : result.error === "FORBIDDEN"
              ? 403
              : 409;
        return res
          .status(status)
          .json({ success: false, message: result.error });
      }
      if (!result.alreadyCompleted) {
        const transaction = await Repo.getById(req.params.id);
        await Notifications.notify(
          Number(transaction?.user_id),
          "DEPOSIT_SUCCESS",
          "Nạp tiền thành công",
          "Số dư ví của bạn đã được cập nhật.",
          { transaction_id: Number(req.params.id) },
        );
      }
      res.json({
        success: true,
        message: "Đã ghi nhận nạp tiền thử nghiệm",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
