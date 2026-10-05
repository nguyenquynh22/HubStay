const Repo = require("../repositories/users.repository");
const TrustService = require("../services/trust.service");
const bcrypt = require("bcryptjs");

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
        return res.status(404).json({ success: false, message: "Not found" });

      if (item.password_hash) {
        delete item.password_hash;
      }

      const trustSummary = await TrustService.getUserTrustSummary(item.user_id);
      res.json({
        success: true,
        data: {
          ...item,
          ...trustSummary,
          is_vip_active:
            !!trustSummary && Number(trustSummary.is_vip_active) === 1,
          is_verified_active:
            !!trustSummary && Number(trustSummary.is_verified_active) === 1,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  getStatus: async (req, res, next) => {
    try {
      const user = await Repo.getById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: "Not found" });
      }

      const trustSummary = await TrustService.getUserTrustSummary(user.user_id);
      res.json({
        success: true,
        data: {
          user_id: user.user_id,
          is_verified: Number(user.is_verified || 0),
          is_vip: Number(user.is_vip || 0),
          vip_expires_at: user.vip_expires_at || null,
          is_verified_active:
            !!trustSummary && Number(trustSummary.is_verified_active) === 1,
          is_vip_active:
            !!trustSummary && Number(trustSummary.is_vip_active) === 1,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      // 1. Tách 'password' ra khỏi req.body để tránh bị chèn trực tiếp tên cột 'password' vào SQL
      const { password, ...otherFields } = req.body;
      const userData = { ...otherFields };

      // 2. Hash mật khẩu và gán vào đúng tên cột trong DB là 'password_hash'
      if (password) {
        const salt = await bcrypt.genSalt(10);
        userData.password_hash = await bcrypt.hash(password, salt);
      }

      // 3. Gọi repository thêm vào CSDL
      const newItem = await Repo.create(userData);

      // 4. Xóa chuỗi hash mật khẩu trước khi gửi về client
      if (newItem && newItem.password_hash) {
        delete newItem.password_hash;
      }

      res.status(201).json({
        success: true,
        message: "Created successfully",
        data: newItem,
      });
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const userData = {};
      for (const field of ["full_name", "phone", "avatar_url"]) {
        if (req.body[field] !== undefined) userData[field] = req.body[field];
      }
      if (
        userData.full_name !== undefined &&
        (typeof userData.full_name !== "string" || !userData.full_name.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: "Họ tên không được để trống",
        });
      }
      if (typeof userData.full_name === "string")
        userData.full_name = userData.full_name.trim();
      if (typeof userData.phone === "string")
        userData.phone = userData.phone.trim() || null;
      if (!Object.keys(userData).length)
        return res.status(400).json({
          success: false,
          message: "Không có thông tin hồ sơ hợp lệ để cập nhật",
        });
      const updated = await Repo.update(req.params.id, userData);
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
