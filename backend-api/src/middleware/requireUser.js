const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) {
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để tiếp tục.",
    });
  }

  try {
    const payload = jwt.verify(token, secret, { issuer: "hubstay-api" });
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId < 1)
      throw new Error("Invalid subject");
    res.locals.user = { userId, role: payload.role };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
  }
};
