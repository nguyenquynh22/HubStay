const Repo = require("../repositories/verification_requests.repository");
const UsersRepo = require("../repositories/users.repository");
const Notifications = require("../services/notifications.service");
const VerificationImages = require("../services/verification_images.service");

module.exports = {
  devVerify: async (req, res, next) => {
    try {
      if (process.env.NODE_ENV === "production")
        return res.status(403).json({
          success: false,
          message: "Chỉ bật xác thực demo ở môi trường phát triển",
        });
      if (req.body.code !== (process.env.DEV_VERIFICATION_CODE || "123456"))
        return res
          .status(400)
          .json({ success: false, message: "Mã xác thực demo không đúng" });
      const user = await UsersRepo.getById(req.params.userId);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "Người dùng không tồn tại" });
      const verifiedAt = new Date();
      await UsersRepo.update(user.user_id, {
        is_verified: 1,
        kyc_status: "APPROVED",
        verified_at: verifiedAt,
      });
      res.json({
        success: true,
        message: "Đã bật tích xanh xác thực demo",
        data: { user_id: user.user_id, is_verified: 1 },
      });
    } catch (err) {
      next(err);
    }
  },
  getAll: async (req, res, next) => {
    try {
      const data = await Repo.getAll();
      res.json({
        success: true,
        data: data.map(({ front_card_url, back_card_url, selfie_image_url, ...item }) => item),
      });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req, res, next) => {
    try {
      const item = await Repo.getById(req.params.id);
      if (!item)
        return res.status(404).json({ success: false, message: "Not found" });
      const {
        front_card_url,
        back_card_url,
        selfie_image_url,
        ...publicItem
      } = item;
      res.json({ success: true, data: publicItem });
    } catch (err) {
      next(err);
    }
  },

  getByUser: async (req, res, next) => {
    try {
      const data = await Repo.getByUserId(req.params.userId);
      res.json({
        success: true,
        data: data.map(({ front_card_url, back_card_url, selfie_image_url, ...item }) => item),
      });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const user_id = Number(req.body.user_id);
      const account_type = req.body.account_type || "STUDENT";
      if (
        !Number.isInteger(user_id) ||
        user_id < 1 ||
        !req.body.front_image ||
        !req.body.selfie_image
      ) {
        return res.status(400).json({
          success: false,
          message: "user_id, ảnh mặt trước giấy tờ và ảnh chân dung là bắt buộc",
        });
      }
      if (!["STUDENT", "WORKER", "LANDLORD"].includes(account_type)) {
        return res.status(400).json({
          success: false,
          message: "Loại tài khoản xác minh không hợp lệ",
        });
      }
      const user = await UsersRepo.getById(user_id);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "Người dùng không tồn tại" });
      if (Number(user.is_verified) === 1)
        return res
          .status(409)
          .json({ success: false, message: "Tài khoản đã được xác minh" });
      const requests = await Repo.getByUserId(user_id);
      if (requests.some((request) => request.status === "PENDING")) {
        return res.status(409).json({
          success: false,
          message: "Bạn đã có yêu cầu KYC đang chờ xử lý",
        });
      }

      const storedImages = [];
      let newItem;
      try {
        const frontImage = await VerificationImages.storeImage(req.body.front_image);
        storedImages.push(frontImage.filename);
        const backImage = req.body.back_image
          ? await VerificationImages.storeImage(req.body.back_image)
          : null;
        if (backImage) storedImages.push(backImage.filename);
        const selfieImage = await VerificationImages.storeImage(req.body.selfie_image);
        storedImages.push(selfieImage.filename);
        newItem = await Repo.create({
          user_id,
          account_type: account_type || "STUDENT",
          front_card_url: frontImage.filename,
          back_card_url: backImage?.filename || null,
          selfie_image_url: selfieImage.filename,
          status: "PENDING",
        });
      } catch (error) {
        await Promise.all(storedImages.map((filename) => VerificationImages.removeImage(filename)));
        throw error;
      }
      await UsersRepo.update(user_id, { kyc_status: "PENDING" });
      const {
        front_card_url,
        back_card_url,
        selfie_image_url,
        ...responseItem
      } = newItem;
      res.status(201).json({
        success: true,
        message: "Yêu cầu xác thực đã được gửi",
        data: responseItem,
      });
    } catch (err) {
      next(err);
    }
  },

  approve: async (req, res, next) => {
    try {
      const updated = await Repo.review(
        req.params.id,
        "APPROVED",
        req.body.reviewer_note || "Đã xác thực thành công",
        req.body.reviewer_id || null,
      );
      if (updated.error) {
        const status = updated.error === "REQUEST_NOT_FOUND" ? 404 : 409;
        return res
          .status(status)
          .json({ success: false, message: updated.error });
      }
      await Notifications.notify(
        updated.user_id,
        "KYC_APPROVED",
        "Xác minh thành công",
        "Tài khoản của bạn đã được xác minh.",
        { request_id: updated.request_id },
      );

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
      const updated = await Repo.review(
        req.params.id,
        "REJECTED",
        req.body.reviewer_note || "Tài liệu chưa đạt yêu cầu",
        req.body.reviewer_id || null,
      );
      if (updated.error) {
        const status = updated.error === "REQUEST_NOT_FOUND" ? 404 : 409;
        return res
          .status(status)
          .json({ success: false, message: updated.error });
      }
      await Notifications.notify(
        updated.user_id,
        "KYC_REJECTED",
        "Yêu cầu xác minh cần bổ sung",
        updated.reviewer_note,
        { request_id: updated.request_id },
      );

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
