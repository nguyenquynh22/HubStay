const Repo = require("../repositories/verification_requests.repository");
const UsersRepo = require("../repositories/users.repository");

module.exports = {
  devVerify: async (req, res, next) => {
    try {
      if (process.env.NODE_ENV === "production") return res.status(403).json({ success: false, message: "Chỉ bật xác thực demo ở môi trường phát triển" });
      if (req.body.code !== (process.env.DEV_VERIFICATION_CODE || "123456")) return res.status(400).json({ success: false, message: "Mã xác thực demo không đúng" });
      const user = await UsersRepo.getById(req.params.userId);
      if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
      await UsersRepo.update(user.user_id, { is_verified: 1 });
      res.json({ success: true, message: "Đã bật tích xanh xác thực demo", data: { user_id: user.user_id, is_verified: 1 } });
    } catch (err) { next(err); }
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
        return res.status(404).json({ success: false, message: "Not found" });
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
      const { user_id, account_type, front_card_url, back_card_url } = req.body;
      if (!user_id || !front_card_url) {
        return res
          .status(400)
          .json({ success: false, message: "user_id và front_card_url là bắt buộc" });
      }

      const newItem = await Repo.create({
        user_id,
        account_type: account_type || "STUDENT",
        front_card_url,
        back_card_url: back_card_url || null,
        status: "PENDING",
      });
      res
        .status(201)
        .json({
          success: true,
          message: "Yêu cầu xác thực đã được gửi",
          data: newItem,
        });
    } catch (err) {
      next(err);
    }
  },

  approve: async (req, res, next) => {
    try {
      const request = await Repo.getById(req.params.id);
      if (!request)
        return res
          .status(404)
          .json({ success: false, message: "Yêu cầu không tồn tại" });

      await UsersRepo.update(request.user_id, { is_verified: 1 });

      const updated = await Repo.update(req.params.id, {
        status: "APPROVED",
        reviewed_at: new Date(),
        reviewer_note: req.body.reviewer_note || "Đã xác thực thành công",
      });

      res.json({
        success: true,
        message: "Xác thực KYC thành công",
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  reject: async (req, res, next) => {
    try {
      const request = await Repo.getById(req.params.id);
      if (!request)
        return res
          .status(404)
          .json({ success: false, message: "Yêu cầu không tồn tại" });

      await UsersRepo.update(request.user_id, { is_verified: 0 });

      const updated = await Repo.update(req.params.id, {
        status: "REJECTED",
        reviewed_at: new Date(),
        reviewer_note: req.body.reviewer_note || "Tài liệu chưa đạt yêu cầu",
      });

      res.json({
        success: true,
        message: "Từ chối xác thực KYC",
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const updated = await Repo.update(req.params.id, req.body);
      res.json({
        success: true,
        message: "Updated successfully",
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const success = await Repo.delete(req.params.id);
      if (!success)
        return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
      next(err);
    }
  },
};
