const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Users = require("../repositories/users.repository");

const allowedRoles = new Set(["STUDENT", "WORKER", "LANDLORD"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const jwtConfigured = () =>
  typeof process.env.JWT_SECRET === "string" &&
  process.env.JWT_SECRET.length >= 32;

const createToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!jwtConfigured()) {
    throw new Error(
      "JWT_SECRET must be configured with at least 32 characters",
    );
  }
  return jwt.sign({ sub: String(user.user_id), role: user.role }, secret, {
    expiresIn: "7d",
    issuer: "hubstay-api",
  });
};

const publicUser = (user) => ({
  user_id: user.user_id,
  full_name: user.full_name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar_url: user.avatar_url,
  is_verified: Number(user.is_verified || 0),
  is_vip: Number(user.is_vip || 0),
  vip_expires_at: user.vip_expires_at || null,
});

module.exports = {
  register: async (req, res, next) => {
    try {
      if (!jwtConfigured()) {
        return res
          .status(503)
          .json({
            success: false,
            message: "Máy chủ chưa cấu hình JWT_SECRET",
          });
      }
      const full_name =
        typeof req.body.full_name === "string" ? req.body.full_name.trim() : "";
      const email =
        typeof req.body.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";
      const phone =
        typeof req.body.phone === "string" ? req.body.phone.trim() : "";
      const password =
        typeof req.body.password === "string" ? req.body.password : "";
      const role = req.body.role || "STUDENT";
      if (!full_name || full_name.length > 100 || !emailPattern.test(email)) {
        return res
          .status(400)
          .json({ success: false, message: "Họ tên hoặc email không hợp lệ" });
      }
      if (password.length < 8 || password.length > 72) {
        return res
          .status(400)
          .json({ success: false, message: "Mật khẩu cần từ 8 đến 72 ký tự" });
      }
      if (!allowedRoles.has(role)) {
        return res
          .status(400)
          .json({ success: false, message: "Loại tài khoản không hợp lệ" });
      }
      if (await Users.getByEmail(email)) {
        return res
          .status(409)
          .json({ success: false, message: "Email đã được đăng ký" });
      }
      if (phone && (await Users.getByPhone(phone))) {
        return res
          .status(409)
          .json({ success: false, message: "Số điện thoại đã được sử dụng" });
      }
      const password_hash = await bcrypt.hash(password, 12);
      const created = await Users.create({
        full_name,
        email,
        phone: phone || null,
        password_hash,
        role,
      });
      const user = publicUser(created);
      res.status(201).json({
        success: true,
        data: { user, access_token: createToken(user) },
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message: "Email hoặc số điện thoại đã được đăng ký",
        });
      }
      next(error);
    }
  },

  login: async (req, res, next) => {
    try {
      if (!jwtConfigured()) {
        return res
          .status(503)
          .json({
            success: false,
            message: "Máy chủ chưa cấu hình JWT_SECRET",
          });
      }
      const email =
        typeof req.body.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";
      const password =
        typeof req.body.password === "string" ? req.body.password : "";
      if (!emailPattern.test(email) || !password) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập email và mật khẩu hợp lệ",
        });
      }
      const user = await Users.getByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({
          success: false,
          message: "Email hoặc mật khẩu không chính xác",
        });
      }
      if (
        user.status !== "ACTIVE" ||
        (user.banned_until && new Date(user.banned_until) > new Date())
      ) {
        return res.status(403).json({
          success: false,
          message: "Tài khoản hiện không thể đăng nhập",
        });
      }
      const safeUser = publicUser(user);
      res.json({
        success: true,
        data: { user: safeUser, access_token: createToken(safeUser) },
      });
    } catch (error) {
      next(error);
    }
  },
};
