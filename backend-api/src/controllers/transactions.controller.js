const Repo = require("../repositories/transactions.repository");

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
      if (!item) return res.status(404).json({ success: false, message: "Giao dịch không tồn tại" });
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
      const { user_id, amount, payment_method, transaction_code } = req.body;

      if (!user_id || !amount || !transaction_code) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp user_id, amount và transaction_code",
        });
      }

      const existingCode = await Repo.getByCode(transaction_code);
      if (existingCode) {
        return res.status(400).json({ success: false, message: "Mã giao dịch đã tồn tại" });
      }

      const newItem = await Repo.create({
        user_id,
        amount,
        payment_method,
        transaction_code,
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
      const { status } = req.body;
      const validStatuses = ["PENDING", "SUCCESS", "FAILED"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
      }

      const success = await Repo.updateStatus(req.params.id, status);
      if (!success) return res.status(404).json({ success: false, message: "Giao dịch không tồn tại" });

      res.json({ success: true, message: "Cập nhật trạng thái giao dịch thành công" });
    } catch (err) {
      next(err);
    }
  },
};