const Repo = require("../repositories/transactions.repository");
const crypto = require("crypto");
const Notifications = require("../services/notifications.service");

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
          .json({ success: false, message: "Giao dịch không tồn tại" });
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
      const user_id = Number(req.body.user_id);
      const amount = Number(req.body.amount);
      const payment_method = req.body.payment_method || "VIETQR";
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
      if (
        !["BANK_TRANSFER", "VIETQR", "ADMIN_MANUAL"].includes(payment_method)
      ) {
        return res.status(400).json({
          success: false,
          message: "Phương thức thanh toán không hợp lệ",
        });
      }
      const transaction_code = `TOPUP-${crypto.randomUUID()}`;

      const newItem = await Repo.create({
        user_id,
        amount,
        payment_method,
        transaction_code,
        transaction_type: "TOP_UP",
        status: "PENDING",
      });

      res.status(201).json({
        success: true,
        message: "Tạo giao dịch thành công",
        data: newItem,
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
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({
          success: false,
          message: "Mô phỏng thanh toán chỉ khả dụng ở môi trường phát triển",
        });
      }
      const result = await Repo.completeTopUp(req.params.id);
      if (result.error) {
        const status = result.error === "TRANSACTION_NOT_FOUND" ? 404 : 409;
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
