const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../common/db");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();
const periods = new Set(["7d", "30d", "quarter", "year"]);

function dateFromPeriod(period) {
  const days = period === "7d" ? 6 : period === "30d" ? 29 : period === "quarter" ? 89 : 364;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

router.post("/login", async (req, res, next) => {
  try {
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      return res.status(503).json({ success: false, message: "Đăng nhập quản trị chưa được cấu hình trên máy chủ." });
    }

    const rawIdentifier = req.body?.identifier ?? req.body?.email ?? req.body?.phone;
    const identifier = typeof rawIdentifier === "string" ? rawIdentifier.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!identifier || !password) return res.status(400).json({ success: false, message: "Vui lòng nhập email/số điện thoại và mật khẩu." });
    const isEmail = identifier.includes("@");
    const lookupValue = isEmail ? identifier.toLowerCase() : identifier;

    const [rows] = await db.query(
      "SELECT user_id, full_name, email, phone, password_hash, role FROM users " +
        `WHERE ${isEmail ? "email" : "phone"} = ? AND role = 'ADMIN' LIMIT 1`,
      [lookupValue],
    );
    const admin = rows[0];
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({ success: false, message: "Email hoặc mật khẩu không chính xác." });
    }

    const token = jwt.sign({ userId: admin.user_id, role: admin.role }, secret, { expiresIn: "12h" });
    return res.json({
      success: true,
      token,
      admin: { id: admin.user_id, name: admin.full_name, email: admin.email, phone: admin.phone, role: admin.role },
    });
  } catch (error) {
    return next(error);
  }
});

router.use(requireAdmin);

router.get("/session", async (req, res, next) => {
  try {
    const adminId = res.locals.admin?.userId;
    if (!Number.isInteger(Number(adminId))) {
      return res.status(401).json({ success: false, message: "Phiên đăng nhập không hợp lệ." });
    }
    const [rows] = await db.query(
      "SELECT user_id, full_name, email, phone, role FROM users WHERE user_id = ? AND role = 'ADMIN' LIMIT 1",
      [adminId],
    );
    const admin = rows[0];
    if (!admin) return res.status(401).json({ success: false, message: "Không tìm thấy tài khoản quản trị." });
    return res.json({
      success: true,
      admin: { userId: admin.user_id, name: admin.full_name, email: admin.email, phone: admin.phone, role: admin.role },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/dashboard", async (req, res, next) => {
  try {
    const period = periods.has(req.query.period) ? req.query.period : "30d";
    const from = dateFromPeriod(period);
    const [[summaryRows], [growth], [postMix]] = await Promise.all([
      db.query(
        "SELECT (SELECT COUNT(*) FROM users WHERE role <> 'ADMIN') AS usersCount, " +
          "(SELECT COUNT(*) FROM posts) AS postsCount, " +
          "(SELECT COUNT(*) FROM verification_requests WHERE status = 'PENDING') AS verificationPending, " +
          "(SELECT COUNT(*) FROM post_reports WHERE status = 'PENDING') AS reportsPending, " +
          "(SELECT COALESCE(SUM(price), 0) FROM subscriptions WHERE status <> 'CANCELLED' AND created_at >= ?) AS vipRevenue",
        [from],
      ),
      db.query(
        "SELECT DATE(created_at) AS date, role, COUNT(*) AS total FROM users " +
          "WHERE created_at >= ? AND role IN ('STUDENT', 'WORKER', 'LANDLORD') " +
          "GROUP BY DATE(created_at), role ORDER BY date ASC",
        [from],
      ),
      db.query(
        "SELECT post_type AS type, COUNT(*) AS total FROM posts WHERE created_at >= ? GROUP BY post_type",
        [from],
      ),
    ]);
    return res.json({
      period,
      summary: Object.fromEntries(Object.entries(summaryRows[0] ?? {}).map(([key, value]) => [key, Number(value ?? 0)])),
      growth,
      postMix,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/verifications", async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT vr.*, u.full_name, u.email, u.avatar_url FROM verification_requests vr " +
        "JOIN users u ON u.user_id = vr.user_id ORDER BY vr.created_at DESC",
    );
    return res.json({ items: rows.map((row) => ({
      id: Number(row.request_id),
      accountType: row.account_type,
      name: row.full_name,
      email: row.email,
      frontCardUrl: row.front_card_url ?? row.front_image_url ?? null,
      backCardUrl: row.back_card_url ?? row.back_image_url ?? null,
      status: row.status,
      rejectionReason: row.rejection_reason ?? null,
      initials: initials(row.full_name),
      avatar: row.avatar_url,
      createdAt: row.created_at,
    })) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/verifications/:id", async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const id = Number(req.params.id);
    const status = req.body?.status;
    if (!Number.isInteger(id) || !["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Thông tin duyệt hồ sơ không hợp lệ." });
    }
    await connection.beginTransaction();
    const [rows] = await connection.query("SELECT user_id FROM verification_requests WHERE request_id = ? FOR UPDATE", [id]);
    if (!rows[0]) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ xác thực." });
    }
    await connection.query(
      "UPDATE verification_requests SET status = ?, rejection_reason = ?, reviewed_at = NOW() WHERE request_id = ?",
      [status, status === "REJECTED" ? String(req.body.reason ?? "Không đạt yêu cầu xác thực") : null, id],
    );
    if (status === "APPROVED") {
      await connection.query("UPDATE users SET is_verified = 1 WHERE user_id = ?", [rows[0].user_id]);
    }
    await connection.commit();
    return res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

router.get("/posts", async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT p.post_id, p.title, p.description, p.post_type, p.price, p.area, p.address_detail, p.status, p.is_approved, p.created_at, " +
        "u.full_name, u.email, u.phone, " +
        "(SELECT image_url FROM post_images WHERE post_id = p.post_id ORDER BY is_cover DESC, image_id ASC LIMIT 1) AS image_url " +
        "FROM posts p JOIN users u ON u.user_id = p.author_id ORDER BY p.created_at DESC",
    );
    return res.json({ items: rows.map((row) => ({
      id: Number(row.post_id),
      title: row.title,
      description: row.description ?? "",
      postType: row.post_type,
      price: Number(row.price ?? 0),
      area: row.area === null ? null : Number(row.area),
      address: row.address_detail,
      status: row.status,
      verified: Boolean(row.is_approved),
      imageUrl: row.image_url,
      author: { name: row.full_name, email: row.email, phone: row.phone, initials: initials(row.full_name) },
      createdAt: row.created_at,
    })) });
  } catch (error) {
    return next(error);
  }
});

router.post("/posts", async (req, res, next) => {
  try {
    const { author_id, title, description, post_type, price, area, address_detail, post_lat, post_lng, status } = req.body ?? {};
    const parsedAuthorId = Number(author_id);
    const parsedPrice = Number(price);
    const parsedArea = area === "" || area === null || area === undefined ? null : Number(area);
    const parsedPostLat = Number(post_lat);
    const parsedPostLng = Number(post_lng);
    const allowedPostTypes = ["RENTAL", "SHARE", "PASS", "FIND"];
    const allowedStatuses = ["AVAILABLE", "RENTED", "HIDDEN"];

    if (!Number.isInteger(parsedAuthorId) || parsedAuthorId < 1 ||
      typeof title !== "string" || !title.trim() ||
      typeof post_type !== "string" || !allowedPostTypes.includes(post_type) ||
      !Number.isFinite(parsedPrice) || parsedPrice <= 0 ||
      (parsedArea !== null && (!Number.isFinite(parsedArea) || parsedArea <= 0)) ||
      post_lat === "" || post_lat === null || post_lat === undefined ||
      !Number.isFinite(parsedPostLat) || parsedPostLat < -90 || parsedPostLat > 90 ||
      post_lng === "" || post_lng === null || post_lng === undefined ||
      !Number.isFinite(parsedPostLng) || parsedPostLng < -180 || parsedPostLng > 180 ||
      (description !== undefined && typeof description !== "string") ||
      (address_detail !== undefined && typeof address_detail !== "string") ||
      (status !== undefined && !allowedStatuses.includes(status))) {
      return res.status(400).json({ success: false, message: "Thông tin bài đăng không hợp lệ." });
    }

    const [authors] = await db.query(
      "SELECT user_id FROM users WHERE user_id = ? AND role = 'LANDLORD' AND status = 'ACTIVE' LIMIT 1",
      [parsedAuthorId],
    );
    if (!authors.length) {
      return res.status(400).json({ success: false, message: "Hãy chọn tài khoản chủ trọ đang hoạt động." });
    }

    const [result] = await db.query(
      "INSERT INTO posts (author_id, title, description, post_type, price, area, address_detail, post_lat, post_lng, status, is_approved, created_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())",
      [
        parsedAuthorId,
        title.trim(),
        typeof description === "string" ? description.trim() : "",
        post_type,
        parsedPrice,
        parsedArea,
        typeof address_detail === "string" ? address_detail.trim() : null,
        parsedPostLat,
        parsedPostLng,
        status ?? "AVAILABLE",
      ],
    );
    return res.status(201).json({ success: true, id: Number(result.insertId) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/posts/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const allowedPostTypes = ["RENTAL", "SHARE", "PASS", "FIND"];
    const allowedStatuses = ["AVAILABLE", "RENTED", "HIDDEN"];
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
    const parsedPrice = Number(body.price);
    const parsedArea = body.area === "" || body.area === null ? null : Number(body.area);

    if (!Number.isInteger(id) || id < 1 ||
      (has("title") && (typeof body.title !== "string" || !body.title.trim())) ||
      (has("description") && typeof body.description !== "string") ||
      (has("post_type") && !allowedPostTypes.includes(body.post_type)) ||
      (has("price") && (!Number.isFinite(parsedPrice) || parsedPrice <= 0)) ||
      (has("area") && parsedArea !== null && (!Number.isFinite(parsedArea) || parsedArea <= 0)) ||
      (has("address_detail") && typeof body.address_detail !== "string" && body.address_detail !== null) ||
      (has("status") && !allowedStatuses.includes(body.status)) ||
      (has("is_approved") && ![true, false, 0, 1].includes(body.is_approved))) {
      return res.status(400).json({ success: false, message: "Thông tin cập nhật bài đăng không hợp lệ." });
    }
    const fields = [
      ["title", "title", (value) => value.trim()],
      ["description", "description", (value) => value.trim()],
      ["post_type", "post_type", (value) => value],
      ["price", "price", () => parsedPrice],
      ["area", "area", () => parsedArea],
      ["address_detail", "address_detail", (value) => value?.trim() || null],
      ["status", "status", (value) => value],
      ["is_approved", "is_approved", (value) => value === true || value === 1 ? 1 : 0],
    ];
    const updates = fields.filter(([key]) => has(key));
    if (!updates.length) {
      return res.status(400).json({ success: false, message: "Không có thông tin nào để cập nhật." });
    }
    const assignments = updates.map(([, column]) => `${column} = ?`);
    const values = updates.map(([key, , normalize]) => normalize(body[key]));
    values.push(id);
    const [result] = await db.query(
      `UPDATE posts SET ${assignments.join(", ")} WHERE post_id = ?`,
      values,
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy bài đăng." });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/reports", async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT r.*, reporter.full_name AS reporter_name, reporter.email AS reporter_email, reporter.phone AS reporter_phone, " +
        "p.title AS post_title, author.full_name AS author_name, author.email AS author_email " +
        "FROM post_reports r " +
        "LEFT JOIN users reporter ON reporter.user_id = r.reporter_id " +
        "LEFT JOIN posts p ON p.post_id = r.post_id " +
        "LEFT JOIN users author ON author.user_id = p.author_id ORDER BY r.created_at DESC",
    );
    return res.json({ items: rows.map((row) => ({
      id: Number(row.report_id),
      reason: row.reason ?? row.description ?? "",
      description: row.description ?? "",
      status: row.status,
      reporter: { name: row.reporter_name ?? "", email: row.reporter_email ?? "", phone: row.reporter_phone ?? "" },
      post: { id: Number(row.post_id ?? 0), title: row.post_title ?? "" },
      target: { name: row.author_name ?? "", email: row.author_email ?? "", initials: initials(row.author_name) },
      createdAt: row.created_at,
    })) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/reports/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const status = req.body?.status;
    if (!Number.isInteger(id) || !["RESOLVED", "DISMISSED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái báo cáo không hợp lệ." });
    }
    const [result] = await db.query("UPDATE post_reports SET status = ? WHERE report_id = ?", [status, id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy báo cáo." });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/landmarks", async (_req, res, next) => {
  try {
    const [rows] = await db.query("SELECT * FROM landmarks ORDER BY created_at DESC");
    const items = rows.map((row) => ({
      ...row,
      landmark_id: Number(row.landmark_id),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    }));
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post("/landmarks", async (req, res, next) => {
  try {
    const { name, address, category, latitude, longitude } = req.body ?? {};
    if (typeof name !== "string" || !name.trim() || typeof address !== "string" || !address.trim() ||
      !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      return res.status(400).json({ success: false, message: "Thông tin địa điểm chưa đầy đủ." });
    }
    if (!["UNIVERSITY", "PARK", "MUSEUM", "HOSPITAL", "SHOPPING", "OTHER"].includes(category)) {
      return res.status(400).json({ success: false, message: "Loại địa điểm không hợp lệ." });
    }
    const [result] = await db.query(
      "INSERT INTO landmarks (name, category, address, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), category || "OTHER", address.trim(), Number(latitude), Number(longitude)],
    );
    return res.status(201).json({ id: result.insertId });
  } catch (error) {
    return next(error);
  }
});

router.put("/landmarks/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, address, category, latitude, longitude } = req.body ?? {};
    if (!Number.isInteger(id) || id < 1 || typeof name !== "string" || !name.trim() ||
      typeof address !== "string" || !address.trim() ||
      !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      return res.status(400).json({ success: false, message: "Thông tin địa điểm chưa đầy đủ." });
    }
    if (!["UNIVERSITY", "PARK", "MUSEUM", "HOSPITAL", "SHOPPING", "OTHER"].includes(category)) {
      return res.status(400).json({ success: false, message: "Loại địa điểm không hợp lệ." });
    }
    const [result] = await db.query(
      "UPDATE landmarks SET name = ?, category = ?, address = ?, latitude = ?, longitude = ? WHERE landmark_id = ?",
      [name.trim(), category, address.trim(), Number(latitude), Number(longitude), id],
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy địa điểm." });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.delete("/landmarks/:id", async (req, res, next) => {
  try {
    const [result] = await db.query("DELETE FROM landmarks WHERE landmark_id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy địa điểm." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get("/transactions", async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT t.*, u.full_name, u.email FROM transactions t JOIN users u ON u.user_id = t.user_id ORDER BY t.created_at DESC",
    );
    const items = rows.map((row) => ({
      ...row,
      transaction_id: Number(row.transaction_id),
      user_id: Number(row.user_id),
      amount: Number(row.amount),
    }));
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.patch("/transactions/:id", async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (!["PENDING", "SUCCESS", "FAILED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái giao dịch không hợp lệ." });
    }
    const [result] = await db.query("UPDATE transactions SET status = ? WHERE transaction_id = ?", [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch." });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/subscriptions", async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT s.*, u.full_name, u.email, u.avatar_url FROM subscriptions s " +
        "JOIN users u ON u.user_id = s.user_id ORDER BY s.created_at DESC",
    );
    const items = rows.map((row) => ({
      ...row,
      subscription_id: Number(row.subscription_id),
      user_id: Number(row.user_id),
      price: Number(row.price),
    }));
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get("/vip-revenue", async (req, res, next) => {
  try {
    const period = periods.has(req.query.period) ? req.query.period : "30d";
    const from = dateFromPeriod(period);
    const [[summaryRows], [activeRows], [trendRows], [planRows], [subscriptionRows]] = await Promise.all([
      db.query(
        "SELECT COALESCE(SUM(price), 0) AS revenue, COUNT(*) AS purchases, COUNT(DISTINCT user_id) AS subscribers " +
          "FROM subscriptions WHERE created_at >= ? AND status <> 'CANCELLED'",
        [from],
      ),
      db.query("SELECT COUNT(*) AS activeVips FROM users WHERE is_vip = 1 AND (vip_expires_at IS NULL OR vip_expires_at > NOW())"),
      db.query(
        "SELECT DATE(created_at) AS date, COALESCE(SUM(price), 0) AS revenue, COUNT(*) AS purchases " +
          "FROM subscriptions WHERE created_at >= ? AND status <> 'CANCELLED' GROUP BY DATE(created_at) ORDER BY date ASC",
        [from],
      ),
      db.query(
        "SELECT package_name AS name, COUNT(*) AS subscribers, COALESCE(SUM(price), 0) AS revenue " +
          "FROM subscriptions WHERE created_at >= ? AND status <> 'CANCELLED' GROUP BY package_name ORDER BY revenue DESC",
        [from],
      ),
      db.query(
        "SELECT s.*, u.full_name, u.email, u.avatar_url FROM subscriptions s " +
          "JOIN users u ON u.user_id = s.user_id WHERE s.created_at >= ? ORDER BY s.created_at DESC LIMIT 100",
        [from],
      ),
    ]);
    const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "quarter" ? 90 : 365;
    const byDate = new Map(trendRows.map((row) => [String(row.date).slice(0, 10), row]));
    const trend = Array.from({ length: days }, (_, index) => {
      const date = new Date(`${from}T00:00:00`);
      date.setDate(date.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      const item = byDate.get(key);
      return { date: key, revenue: Number(item?.revenue ?? 0), purchases: Number(item?.purchases ?? 0) };
    });
    return res.json({
      period,
      summary: {
        revenue: Number(summaryRows[0]?.revenue ?? 0),
        purchases: Number(summaryRows[0]?.purchases ?? 0),
        subscribers: Number(summaryRows[0]?.subscribers ?? 0),
        activeVips: Number(activeRows[0]?.activeVips ?? 0),
      },
      trend,
      plans: planRows.map((row) => ({ name: row.name, subscribers: Number(row.subscribers), revenue: Number(row.revenue) })),
      subscriptions: subscriptionRows.map((row) => ({
        id: Number(row.subscription_id),
        userId: Number(row.user_id),
        user: { name: row.full_name, email: row.email, initials: initials(row.full_name), avatar: row.avatar_url, avatarTone: "bg-[#dfeaff] text-[#254ad8]" },
        packageName: row.package_name,
        price: Number(row.price),
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/vip-subscriptions", async (req, res, next) => {
  let connection;
  try {
    const userId = Number(req.body?.userId);
    const packageName = String(req.body?.packageName ?? "").trim();
    const price = Number(req.body?.price);
    const startDate = String(req.body?.startDate ?? "");
    const endDate = String(req.body?.endDate ?? "");
    const paymentMethod = String(req.body?.paymentMethod ?? "ADMIN_MANUAL");
    if (!Number.isInteger(userId) || !packageName || !Number.isFinite(price) || price <= 0 || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: "Thông tin đăng ký VIP chưa hợp lệ." });
    }
    if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
      return res.status(400).json({ success: false, message: "Ngày kết thúc phải sau ngày bắt đầu." });
    }
    if (!["BANK_TRANSFER", "VIETQR", "ADMIN_MANUAL"].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "Phương thức thanh toán không hợp lệ." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    const [users] = await connection.query("SELECT user_id, role FROM users WHERE user_id = ? FOR UPDATE", [userId]);
    if (!users[0]) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    }
    if (users[0].role !== "LANDLORD") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Gói VIP chỉ dành cho tài khoản chủ trọ." });
    }
    const transactionCode = `VIP-${Date.now()}-${userId}`;
    await connection.query(
      "INSERT INTO transactions (user_id, amount, payment_method, transaction_code, status) VALUES (?, ?, ?, ?, 'SUCCESS')",
      [userId, price, paymentMethod, transactionCode],
    );
    const [subscription] = await connection.query(
      "INSERT INTO subscriptions (user_id, package_name, price, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')",
      [userId, packageName, price, startDate, endDate],
    );
    await connection.query(
      "UPDATE users SET is_vip = 1, vip_expires_at = GREATEST(COALESCE(vip_expires_at, ?), ?) WHERE user_id = ?",
      [endDate, endDate, userId],
    );
    await connection.commit();
    return res.status(201).json({ id: subscription.insertId, transactionCode });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
