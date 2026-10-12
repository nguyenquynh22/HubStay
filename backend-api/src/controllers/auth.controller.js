const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createHash, randomInt, timingSafeEqual } = require("node:crypto");
const Users = require("../repositories/users.repository");
const { sendAuthOtpEmail } = require("../services/auth-email.service");
const { isValidPassword } = require("../lib/password-policy");

const allowedRoles = new Set(["STUDENT", "WORKER", "LANDLORD"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const CHALLENGE_TTL_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const challenges = new Map();
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

const challengeKey = (purpose, email) => `${purpose}:${email}`;
const hashOtp = (otp) => createHash("sha256").update(otp).digest();

const sendChallengeOtp = async ({ purpose, email, payload, fullName }) => {
  const key = challengeKey(purpose, email);
  const current = challenges.get(key);
  const now = Date.now();
  if (current?.flowExpiresAt <= now) challenges.delete(key);
  const active = challenges.get(key);
  if (active && active.resendAvailableAt > now) {
    return {
      sent: false,
      waitSeconds: Math.ceil((active.resendAvailableAt - now) / 1000),
    };
  }

  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await sendAuthOtpEmail({ email, fullName, otp, purpose });
  const sentAt = Date.now();
  challenges.set(key, {
    ...payload,
    otpHash: hashOtp(otp),
    expiresAt: sentAt + OTP_TTL_MS,
    resendAvailableAt: sentAt + RESEND_COOLDOWN_MS,
    flowExpiresAt: active?.flowExpiresAt || sentAt + CHALLENGE_TTL_MS,
    attempts: 0,
  });
  return { sent: true, waitSeconds: RESEND_COOLDOWN_MS / 1000 };
};

const checkChallengeOtp = (challenge, otp) => {
  const now = Date.now();
  if (challenge.flowExpiresAt <= now) return "flow_expired";
  if (challenge.expiresAt <= now) return "otp_expired";
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    challenge.attempts += 1;
    return "invalid";
  }
  const candidate = hashOtp(otp);
  if (!timingSafeEqual(challenge.otpHash, candidate)) {
    challenge.attempts += 1;
    return "invalid";
  }
  return "valid";
};

const respondToOtpFailure = (res, result, key, challenge) => {
  if (result === "flow_expired") {
    challenges.delete(key);
    return res.status(410).json({
      success: false,
      message: "Yêu cầu đã hết hạn. Vui lòng thực hiện lại.",
    });
  }
  if (result === "otp_expired") {
    return res.status(410).json({
      success: false,
      message: "Mã OTP đã hết hạn. Vui lòng gửi lại mã.",
    });
  }
  if (result === "invalid") {
    if (challenge.attempts >= MAX_OTP_ATTEMPTS) challenges.delete(key);
    return res.status(400).json({
      success: false,
      message:
        challenge.attempts >= MAX_OTP_ATTEMPTS
          ? "Bạn đã nhập sai quá số lần cho phép. Vui lòng thực hiện lại."
          : "Mã xác thực không chính xác",
    });
  }
};

module.exports = {
  register: async (req, res, next) => {
    try {
      if (!jwtConfigured()) {
        return res.status(503).json({
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
      if (!isValidPassword(password)) {
        return res.status(400).json({
          success: false,
          message:
            "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
        });
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
      const resend = await sendChallengeOtp({
        purpose: "REGISTER",
        email,
        fullName: full_name,
        payload: {
          registration: {
            full_name,
            email,
            phone: phone || null,
            password_hash,
            role,
          },
        },
      });
      if (!resend.sent) {
        return res.status(429).json({
          success: false,
          message: `Vui lòng chờ ${resend.waitSeconds} giây trước khi gửi lại mã.`,
          data: { resend_after_seconds: resend.waitSeconds },
        });
      }
      res.status(202).json({
        success: true,
        message: "Mã OTP đã được gửi đến email của bạn.",
        data: { email, expires_in_seconds: 60, resend_after_seconds: 60 },
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

  verifyRegistrationOtp: async (req, res, next) => {
    try {
      const email =
        typeof req.body.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";
      const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";
      if (!emailPattern.test(email)) {
        return res
          .status(400)
          .json({ success: false, message: "Email không hợp lệ" });
      }
      const key = challengeKey("REGISTER", email);
      const challenge = challenges.get(key);
      if (!challenge?.registration) {
        return res.status(400).json({
          success: false,
          message: "Không tìm thấy yêu cầu đăng ký. Vui lòng đăng ký lại.",
        });
      }
      const result = checkChallengeOtp(challenge, otp);
      if (result !== "valid")
        return respondToOtpFailure(res, result, key, challenge);
      if (!jwtConfigured()) {
        return res.status(503).json({
          success: false,
          message: "Máy chủ chưa cấu hình JWT_SECRET",
        });
      }
      const created = await Users.create(challenge.registration);
      challenges.delete(key);
      const user = publicUser(created);
      return res.status(201).json({
        success: true,
        message: "Đăng ký tài khoản thành công.",
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

  resendRegistrationOtp: async (req, res, next) => {
    try {
      const email =
        typeof req.body.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";
      const key = challengeKey("REGISTER", email);
      const challenge = challenges.get(key);
      if (!emailPattern.test(email) || !challenge?.registration) {
        return res.status(400).json({
          success: false,
          message: "Không tìm thấy yêu cầu đăng ký còn hiệu lực.",
        });
      }
      if (challenge.flowExpiresAt <= Date.now()) {
        challenges.delete(key);
        return res.status(410).json({
          success: false,
          message: "Yêu cầu đăng ký đã hết hạn. Vui lòng đăng ký lại.",
        });
      }
      const resend = await sendChallengeOtp({
        purpose: "REGISTER",
        email,
        fullName: challenge.registration.full_name,
        payload: { registration: challenge.registration },
      });
      if (!resend.sent) {
        return res.status(429).json({
          success: false,
          message: `Vui lòng chờ ${resend.waitSeconds} giây trước khi gửi lại mã.`,
          data: { resend_after_seconds: resend.waitSeconds },
        });
      }
      return res.json({
        success: true,
        message: "Mã OTP mới đã được gửi đến email của bạn.",
        data: { expires_in_seconds: 60, resend_after_seconds: 60 },
      });
    } catch (error) {
      next(error);
    }
  },

  login: async (req, res, next) => {
    try {
      if (!jwtConfigured()) {
        return res.status(503).json({
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

  forgotPassword: async (req, res, next) => {
    try {
      const email =
        typeof req.body.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";
      if (!emailPattern.test(email)) {
        return res
          .status(400)
          .json({ success: false, message: "Email không hợp lệ" });
      }
      const genericResponse = {
        success: true,
        message: "Nếu email đã đăng ký, mã OTP sẽ được gửi đến hộp thư.",
      };
      const user = await Users.getByEmail(email);
      if (!user || user.role === "ADMIN") {
        return res.json(genericResponse);
      }
      let resend;
      try {
        resend = await sendChallengeOtp({
          purpose: "RESET_PASSWORD",
          email,
          payload: { userId: user.user_id },
        });
      } catch (error) {
        console.error(
          "Password reset OTP email could not be sent:",
          error.message,
        );
        return res.json(genericResponse);
      }
      if (!resend.sent) {
        return res.json(genericResponse);
      }
      return res.json(genericResponse);
    } catch (error) {
      next(error);
    }
  },

  resetPassword: async (req, res, next) => {
    try {
      const email =
        typeof req.body.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";
      const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";
      const password =
        typeof req.body.new_password === "string" ? req.body.new_password : "";
      if (!emailPattern.test(email)) {
        return res
          .status(400)
          .json({ success: false, message: "Email không hợp lệ" });
      }
      if (!isValidPassword(password)) {
        return res.status(400).json({
          success: false,
          message:
            "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
        });
      }
      const key = challengeKey("RESET_PASSWORD", email);
      const challenge = challenges.get(key);
      if (!challenge) {
        return res.status(400).json({
          success: false,
          message: "Mã OTP không hợp lệ hoặc đã hết hạn.",
        });
      }
      const result = checkChallengeOtp(challenge, otp);
      if (result !== "valid")
        return respondToOtpFailure(res, result, key, challenge);
      const password_hash = await bcrypt.hash(password, 12);
      const updated = await Users.update(challenge.userId, { password_hash });
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài khoản để đặt lại mật khẩu.",
        });
      }
      challenges.delete(key);
      return res.json({
        success: true,
        message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.",
      });
    } catch (error) {
      next(error);
    }
  },
};
