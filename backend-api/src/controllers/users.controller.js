const Repo = require("../repositories/users.repository");
const TrustService = require("../services/trust.service");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("node:crypto");
const { sendActivationEmail } = require("../services/activation-email.service");

const roles = new Set(["STUDENT", "WORKER", "LANDLORD"]);
const statuses = new Set(["ACTIVE", "WARNING", "BANNED"]);

function validationError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function optionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeUserData(body, { creating = false } = {}) {
  const data = {};
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (creating || body.full_name !== undefined) {
    if (!fullName || fullName.length > 100) throw validationError("Họ và tên phải có từ 1 đến 100 ký tự.");
    data.full_name = fullName;
  }
  if (creating || body.email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
      throw validationError("Địa chỉ email không hợp lệ.");
    }
    data.email = email;
  }
  if (creating || body.phone !== undefined) {
    const phone = optionalText(body.phone);
    if (phone && phone.length > 15) throw validationError("Số điện thoại không được vượt quá 15 ký tự.");
    data.phone = phone;
  }
  if (creating || body.role !== undefined) {
    const role = body.role ?? "STUDENT";
    if (!roles.has(role)) throw validationError("Vai trò tài khoản không hợp lệ.");
    data.role = role;
  }
  if (body.avatar_url !== undefined) data.avatar_url = optionalText(body.avatar_url);
  if (body.status !== undefined || creating) {
    const status = body.status ?? "ACTIVE";
    if (!statuses.has(status)) throw validationError("Trạng thái tài khoản không hợp lệ.");
    data.status = status;
  }
  for (const field of ["is_verified", "is_vip"]) {
    if (body[field] !== undefined || creating) {
      const value = body[field] ?? 0;
      if (![true, false, 0, 1, "0", "1"].includes(value)) throw validationError("Giá trị cờ tài khoản không hợp lệ.");
      data[field] = value === true || value === 1 || value === "1" ? 1 : 0;
    }
  }
  for (const field of ["vip_expires_at", "banned_until", "ban_reason"]) {
    if (body[field] !== undefined || creating) data[field] = optionalText(body[field]);
  }
  if (body.password !== undefined || creating) {
    const password = typeof body.password === "string" ? body.password : "";
    if (creating && password.length < 8) throw validationError("Mật khẩu cần có ít nhất 8 ký tự.");
    if (!creating && password && password.length < 8) throw validationError("Mật khẩu cần có ít nhất 8 ký tự.");
    if (password) data.password = password;
    else if (creating) throw validationError("Vui lòng nhập mật khẩu khởi tạo.");
  }

  return data;
}

function respondWithError(err, res, next) {
  if (err.status === 400) {
    res.status(err.status).json({ success: false, message: err.message });
    return;
  }
  if (err.code === "ER_DUP_ENTRY") {
    res.status(409).json({ success: false, message: "Email hoặc số điện thoại đã được sử dụng." });
    return;
  }
  next(err);
}

module.exports = {
  getAll: async (req, res, next) => {
    try {
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
      const role = req.query.role ? String(req.query.role) : "";
      const status = req.query.status ? String(req.query.status) : "";
      const verified = req.query.verified === undefined ? "" : String(req.query.verified);
      if (role && !roles.has(role)) return res.status(400).json({ success: false, message: "Vai trò tài khoản không hợp lệ." });
      if (status && !statuses.has(status)) return res.status(400).json({ success: false, message: "Trạng thái tài khoản không hợp lệ." });
      if (verified && !["true", "false"].includes(verified)) return res.status(400).json({ success: false, message: "Bộ lọc xác thực không hợp lệ." });

      const result = await Repo.getAll({
        search: String(req.query.search ?? "").trim().slice(0, 100),
        role,
        status,
        verified,
        page,
        limit,
      });
      res.json({ success: true, data: result.items, total: result.total, page, limit, summary: result.summary });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req, res, next) => {
    try {
      const item = await Repo.getPublicById(req.params.id);
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
  getAdminById: async (req, res, next) => {
    try {
      const item = await Repo.getById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const passwordSetup = req.body?.password_setup ?? "SET_PASSWORD";
      if (!["ACTIVATION_LINK", "SET_PASSWORD"].includes(passwordSetup)) {
        throw validationError("Phương thức thiết lập mật khẩu không hợp lệ.");
      }
      const activationMode = passwordSetup === "ACTIVATION_LINK";
      if (activationMode && !process.env.ADMIN_JWT_SECRET) {
        return res.status(503).json({ success: false, message: "Chức năng kích hoạt tài khoản chưa được cấu hình." });
      }
      const activationSecret = activationMode ? randomBytes(32).toString("base64url") : null;
      const userData = normalizeUserData({
        ...req.body,
        password: activationSecret ?? req.body?.password,
      }, { creating: true });
      userData.is_verified = 0;
      userData.password_hash = await bcrypt.hash(activationSecret ?? userData.password, 10);
      delete userData.password;
      const newItem = await Repo.create(userData);
      const activationToken = activationMode
        ? jwt.sign({
            userId: newItem.user_id,
            purpose: "user_activation",
            nonce: activationSecret,
          }, process.env.ADMIN_JWT_SECRET, { expiresIn: "48h" })
        : null;
      let emailResult = null;
      if (activationMode) {
        try {
          emailResult = await sendActivationEmail({
            email: userData.email,
            fullName: userData.full_name,
            token: activationToken,
          });
        } catch (emailError) {
          console.error("Activation email could not be sent:", emailError.message);
          emailResult = { sent: false, reason: "Gmail không gửi được email. Kiểm tra cấu hình Gmail và thử lại." };
        }
      }
      res.status(201).json({
        success: true,
        message: emailResult?.sent
          ? "Tạo tài khoản thành công và đã gửi email kích hoạt."
          : activationMode
            ? "Tạo tài khoản thành công nhưng chưa gửi được email kích hoạt."
            : "Tạo tài khoản thành công.",
        data: newItem,
        ...(activationMode ? {
          email_sent: emailResult.sent,
          ...(emailResult.sent ? {} : { email_error: emailResult.reason, activation_token: activationToken }),
        } : {}),
      });
    } catch (err) {
      respondWithError(err, res, next);
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const userData = {};
      for (const field of ["full_name", "phone", "avatar_url"]) {
        if (req.body?.[field] !== undefined) userData[field] = req.body[field];
      }
      if (
        userData.full_name !== undefined &&
        (typeof userData.full_name !== "string" ||
          !userData.full_name.trim() ||
          userData.full_name.trim().length > 100)
      ) {
        return res.status(400).json({
          success: false,
          message: "Họ tên phải có từ 1 đến 100 ký tự.",
        });
      }
      if (userData.full_name !== undefined) userData.full_name = userData.full_name.trim();
      if (userData.phone !== undefined) {
        if (userData.phone !== null && typeof userData.phone !== "string") {
          return res.status(400).json({ success: false, message: "Số điện thoại không hợp lệ." });
        }
        userData.phone = optionalText(userData.phone);
        if (userData.phone && userData.phone.length > 15) {
          return res.status(400).json({ success: false, message: "Số điện thoại không được vượt quá 15 ký tự." });
        }
      }
      if (userData.avatar_url !== undefined) {
        if (userData.avatar_url !== null && typeof userData.avatar_url !== "string") {
          return res.status(400).json({ success: false, message: "Ảnh đại diện không hợp lệ." });
        }
        userData.avatar_url = optionalText(userData.avatar_url);
      }
      if (!Object.keys(userData).length) {
        return res.status(400).json({
          success: false,
          message: "Không có thông tin hồ sơ hợp lệ để cập nhật.",
        });
      }
      const updated = await Repo.update(req.params.id, userData);
      if (!updated) return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const userData = normalizeUserData(req.body);
      if (userData.password) {
        userData.password_hash = await bcrypt.hash(userData.password, 10);
        delete userData.password;
      }
      const updated = await Repo.update(req.params.id, userData);
      if (!updated) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
      res.json({ success: true, message: "Cập nhật tài khoản thành công.", data: updated });
    } catch (err) {
      respondWithError(err, res, next);
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
