const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    return res.status(503).json({
      success: false,
      message: "Đăng nhập quản trị chưa được cấu hình trên máy chủ.",
    });
  }

  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ success: false, message: "Vui lòng đăng nhập quản trị viên." });
  }

  try {
    const payload = jwt.verify(token, secret);
    if (!payload || typeof payload !== "object" || payload.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Bạn không có quyền truy cập quản trị." });
    }
    res.locals.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
  }
}

module.exports = requireAdmin;
