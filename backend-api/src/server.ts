import cors from "cors";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import mysql, { type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5000);
const jwtSecret = process.env.ADMIN_JWT_SECRET;
const allowedOrigins = new Set(
  [
    process.env.ADMIN_WEB_ORIGIN ?? "http://localhost:3000",
    process.env.EXPO_WEB_ORIGINS ??
      "http://localhost:8081,http://127.0.0.1:8081",
  ]
    .flatMap((origins) => origins.split(","))
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "hubstay_db",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

type Period = "7d" | "30d" | "quarter" | "year";
type AdminToken = { userId: number; role: string };

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!jwtSecret) {
    res.status(503).json({ success: false, message: "Đăng nhập quản trị chưa được cấu hình trên máy chủ." });
    return;
  }

  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ message: "Thiếu phiên đăng nhập quản trị viên." });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as AdminToken;
    if (payload.role !== "ADMIN") {
      res.status(403).json({ message: "Bạn không có quyền truy cập quản trị." });
      return;
    }
    res.locals.admin = payload;
    next();
  } catch {
    res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
  }
}

function getPeriod(value: unknown): Period {
  return value === "7d" || value === "30d" || value === "quarter" || value === "year" ? value : "30d";
}

function periodStart(period: Period) {
  const date = new Date();
  const days = period === "7d" ? 6 : period === "30d" ? 29 : period === "quarter" ? 89 : 364;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function asNumber(value: unknown) {
  return Number(value ?? 0);
}

function avatarTone(index: number) {
  const tones = [
    "bg-[#dfeaff] text-[#254ad8]",
    "bg-[#e5f7ec] text-[#1a9a63]",
    "bg-[#fff0d9] text-[#b7791f]",
    "bg-[#efe7ff] text-[#7c3aed]",
  ];
  return tones[index % tones.length];
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    STUDENT: "Sinh viên",
    WORKER: "Người đi làm",
    LANDLORD: "Chủ trọ",
    ADMIN: "Quản trị viên",
  };
  return labels[role] ?? role;
}

function statusTone(status: string) {
  if (status === "ACTIVE" || status === "APPROVED" || status === "RESOLVED") return "green";
  if (status === "PENDING") return "amber";
  if (status === "BANNED" || status === "REJECTED") return "red";
  return "gray";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Đang hoạt động",
    WARNING: "Cảnh báo",
    BANNED: "Bị khóa",
    PENDING: "Đang chờ duyệt",
    APPROVED: "Đã xác thực",
    REJECTED: "Từ chối",
    RESOLVED: "Đã xử lý",
    DISMISSED: "Không vi phạm",
    AVAILABLE: "Đang hoạt động",
    RENTED: "Đã cho thuê",
    HIDDEN: "Đã ẩn",
  };
  return labels[status] ?? status;
}

function postTypeLabel(type: string) {
  const labels: Record<string, string> = {
    RENTAL: "Cho thuê",
    SHARE: "Ở ghép",
    PASS: "Pass / Nhượng phòng",
    FIND: "Tìm phòng",
  };
  return labels[type] ?? type;
}

function landmarkCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    UNIVERSITY: "Trường học",
    PARK: "Công viên",
    MUSEUM: "Bảo tàng",
    HOSPITAL: "Bệnh viện",
    SHOPPING: "Mua sắm",
    OTHER: "Địa điểm khác",
  };
  return labels[category] ?? category;
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "database_unavailable" });
  }
});

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "HubStay API đang hoạt động.",
    health: "/api/health",
  });
});

app.get("/api/admin/session", requireAdmin, (_req, res) => {
  res.json({ success: true, admin: res.locals.admin ?? null });
});

app.get("/api/admin/dashboard", requireAdmin, async (req, res, next) => {
  try {
    const period = getPeriod(req.query.period);
    const from = formatDate(periodStart(period));
    const [totals] = await pool.query<RowDataPacket[]>(
      "SELECT " +
        "(SELECT COUNT(*) FROM users WHERE role <> 'ADMIN') AS usersCount, " +
        "(SELECT COUNT(*) FROM posts) AS postsCount, " +
        "(SELECT COUNT(*) FROM verification_requests WHERE status = 'PENDING') AS verificationPending, " +
        "(SELECT COUNT(*) FROM post_reports WHERE status = 'PENDING') AS reportsPending, " +
        "(SELECT COALESCE(SUM(price), 0) FROM subscriptions WHERE status <> 'CANCELLED' AND created_at >= ?) AS vipRevenue",
      [from],
    );
    const [growth] = await pool.query<RowDataPacket[]>(
      "SELECT DATE(created_at) AS date, role, COUNT(*) AS total " +
        "FROM users WHERE created_at >= ? AND role IN ('STUDENT', 'WORKER', 'LANDLORD') " +
        "GROUP BY DATE(created_at), role ORDER BY date ASC",
      [from],
    );
    const [postMix] = await pool.query<RowDataPacket[]>(
      "SELECT post_type, COUNT(*) AS total FROM posts WHERE created_at >= ? GROUP BY post_type",
      [from],
    );
    res.json({
      period,
      summary: {
        usersCount: asNumber(totals[0]?.usersCount),
        postsCount: asNumber(totals[0]?.postsCount),
        verificationPending: asNumber(totals[0]?.verificationPending),
        reportsPending: asNumber(totals[0]?.reportsPending),
        vipRevenue: asNumber(totals[0]?.vipRevenue),
      },
      growth,
      postMix,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/users", requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const search = String(req.query.search ?? "").trim();
    const filter = search ? "WHERE full_name LIKE ? OR email LIKE ? OR phone LIKE ?" : "";
    const values = search ? ["%" + search + "%", "%" + search + "%", "%" + search + "%"] : [];
    const [countRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM users " + filter, values);
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, full_name, email, phone, role, avatar_url, is_verified, is_vip, vip_expires_at, status, created_at " +
        "FROM users " +
        filter +
        " ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [...values, limit, (page - 1) * limit],
    );
    res.json({
      items: rows.map((row, index) => ({
        id: asNumber(row.user_id),
        name: row.full_name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        roleLabel: roleLabel(row.role),
        verified: Boolean(row.is_verified),
        vip: Boolean(row.is_vip),
        vipExpiresAt: row.vip_expires_at,
        status: row.status,
        statusLabel: statusLabel(row.status),
        statusTone: statusTone(row.status),
        initials: initials(row.full_name),
        avatar: row.avatar_url,
        avatarTone: avatarTone(index),
        createdAt: row.created_at,
      })),
      total: asNumber(countRows[0]?.total),
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/verifications", requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT vr.request_id, vr.account_type, vr.front_card_url, vr.back_card_url, vr.status, vr.rejection_reason, " +
        "vr.created_at, u.user_id, u.full_name, u.email, u.avatar_url " +
        "FROM verification_requests vr JOIN users u ON u.user_id = vr.user_id " +
        "ORDER BY vr.created_at DESC LIMIT 100",
    );
    res.json({
      items: rows.map((row, index) => ({
        id: asNumber(row.request_id),
        accountType: row.account_type,
        name: row.full_name,
        email: row.email,
        frontCardUrl: row.front_card_url,
        backCardUrl: row.back_card_url,
        status: row.status,
        statusLabel: statusLabel(row.status),
        statusTone: statusTone(row.status),
        rejectionReason: row.rejection_reason,
        initials: initials(row.full_name),
        avatar: row.avatar_url,
        avatarTone: avatarTone(index),
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/verifications/:id", requireAdmin, async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const status = req.body?.status;
    if (!Number.isInteger(id) || !["APPROVED", "REJECTED"].includes(status)) {
      res.status(400).json({ message: "Dữ liệu duyệt hồ sơ không hợp lệ." });
      return;
    }
    await connection.beginTransaction();
    const [requests] = await connection.execute<RowDataPacket[]>(
      "SELECT user_id FROM verification_requests WHERE request_id = ? FOR UPDATE",
      [id],
    );
    if (!requests[0]) {
      await connection.rollback();
      res.status(404).json({ message: "Không tìm thấy hồ sơ xác thực." });
      return;
    }
    const adminId = Number(res.locals.admin?.userId) || null;
    await connection.execute(
      "UPDATE verification_requests SET status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE request_id = ?",
      [status, status === "REJECTED" ? String(req.body?.reason ?? "Không đạt yêu cầu xác thực") : null, adminId, id],
    );
    if (status === "APPROVED") {
      await connection.execute("UPDATE users SET is_verified = 1 WHERE user_id = ?", [requests[0].user_id]);
    }
    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

app.get("/api/admin/posts", requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT p.post_id, p.title, p.post_type, p.price, p.area, p.address_detail, p.status, p.is_approved, p.created_at, " +
        "u.full_name, u.email, u.phone, " +
        "(SELECT image_url FROM post_images WHERE post_id = p.post_id ORDER BY is_cover DESC, image_id ASC LIMIT 1) AS image_url " +
        "FROM posts p JOIN users u ON u.user_id = p.author_id ORDER BY p.created_at DESC LIMIT 100",
    );
    res.json({
      items: rows.map((row, index) => ({
        id: asNumber(row.post_id),
        title: row.title,
        postType: row.post_type,
        postTypeLabel: postTypeLabel(row.post_type),
        price: asNumber(row.price),
        area: row.area === null ? null : asNumber(row.area),
        address: row.address_detail,
        status: row.is_approved ? row.status : "PENDING",
        statusLabel: row.is_approved ? statusLabel(row.status) : "Chờ duyệt",
        statusTone: row.is_approved ? statusTone(row.status) : "amber",
        imageUrl: row.image_url,
        author: { name: row.full_name, email: row.email, phone: row.phone, initials: initials(row.full_name), avatarTone: avatarTone(index) },
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/reports", requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT r.report_id, r.reason, r.description, r.evidence_image_url, r.status, r.created_at, " +
        "reporter.full_name AS reporter_name, reporter.email AS reporter_email, reporter.phone AS reporter_phone, " +
        "p.post_id, p.title AS post_title, p.description AS post_description, p.post_type, p.price, p.area, " +
        "p.address_detail, p.status AS post_status, p.is_approved, p.created_at AS post_created_at, " +
        "author.full_name AS author_name, author.email AS author_email, author.phone AS author_phone, " +
        "(SELECT GROUP_CONCAT(image_url ORDER BY is_cover DESC, image_id ASC SEPARATOR '||') FROM post_images WHERE post_id = p.post_id) AS post_image_urls, " +
        "(SELECT COUNT(*) FROM post_reports pr WHERE pr.post_id = r.post_id) AS post_report_count, " +
        "(SELECT COUNT(*) FROM post_reports pr WHERE pr.post_id = r.post_id AND pr.status = 'PENDING') AS pending_report_count, " +
        "(SELECT MAX(pr.created_at) FROM post_reports pr WHERE pr.post_id = r.post_id AND pr.status = 'PENDING') AS latest_pending_report_at " +
        "FROM post_reports r " +
        "LEFT JOIN users reporter ON reporter.user_id = r.reporter_id " +
        "LEFT JOIN posts p ON p.post_id = r.post_id " +
        "LEFT JOIN users author ON author.user_id = p.author_id " +
        "ORDER BY pending_report_count DESC, latest_pending_report_at DESC, r.created_at DESC",
    );
    res.json({
      items: rows.map((row) => ({
        id: asNumber(row.report_id),
        reason: row.reason ?? "",
        description: row.description ?? "",
        evidenceImageUrl: row.evidence_image_url ?? "",
        status: row.status,
        pendingReportCount: asNumber(row.pending_report_count),
        statusLabel: statusLabel(row.status),
        statusTone: statusTone(row.status),
        reporter: { name: row.reporter_name ?? "", email: row.reporter_email ?? "", phone: row.reporter_phone ?? null },
        post: {
          id: asNumber(row.post_id),
          title: row.post_title ?? "",
          description: row.post_description ?? "",
          postType: row.post_type ?? "",
          price: row.price === null || row.price === undefined ? null : asNumber(row.price),
          area: row.area === null || row.area === undefined ? null : asNumber(row.area),
          address: row.address_detail ?? "",
          status: row.post_status ?? "",
          verified: Boolean(row.is_approved),
          imageUrls: typeof row.post_image_urls === "string" ? row.post_image_urls.split("||").filter(Boolean) : [],
          reportCount: asNumber(row.post_report_count),
          createdAt: row.post_created_at ?? null,
        },
        target: { name: row.author_name ?? "", email: row.author_email ?? "", phone: row.author_phone ?? null, initials: initials(row.author_name ?? "") },
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/reports/:id", requireAdmin, async (req, res, next) => {
  let connection: PoolConnection | undefined;
  try {
    const id = Number(req.params.id);
    const status = req.body?.status;
    if (!Number.isInteger(id) || !["RESOLVED", "DISMISSED"].includes(status)) {
      res.status(400).json({ message: "Trạng thái báo cáo không hợp lệ." });
      return;
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [reportRows] = await connection.execute<RowDataPacket[]>(
      "SELECT report_id, post_id FROM post_reports WHERE report_id = ?",
      [id],
    );
    if (!reportRows[0]) {
      await connection.rollback();
      res.status(404).json({ message: "Không tìm thấy báo cáo." });
      return;
    }
    const [postRows] = await connection.execute<RowDataPacket[]>(
      "SELECT post_id, author_id FROM posts WHERE post_id = ?",
      [reportRows[0].post_id],
    );
    if (!postRows[0]) {
      await connection.rollback();
      res.status(409).json({ message: "Bài đăng không còn tồn tại." });
      return;
    }
    const [owners] = await connection.execute<RowDataPacket[]>(
      "SELECT user_id, full_name, status, banned_until, (banned_until IS NOT NULL AND banned_until > NOW()) AS posting_restricted FROM users WHERE user_id = ? FOR UPDATE",
      [postRows[0].author_id],
    );
    const owner = owners[0];
    if (!owner) {
      await connection.rollback();
      res.status(409).json({ message: "Không tìm thấy chủ bài đăng." });
      return;
    }
    const [lockedPosts] = await connection.execute<RowDataPacket[]>(
      "SELECT post_id, author_id, title, status, is_approved FROM posts WHERE post_id = ? FOR UPDATE",
      [reportRows[0].post_id],
    );
    const post = lockedPosts[0];
    if (!post) {
      await connection.rollback();
      res.status(409).json({ message: "Bài đăng không còn tồn tại." });
      return;
    }
    const [lockedReports] = await connection.execute<RowDataPacket[]>(
      "SELECT report_id, post_id, reporter_id, status FROM post_reports WHERE report_id = ? FOR UPDATE",
      [id],
    );
    const report = lockedReports[0];
    if (!report) {
      await connection.rollback();
      res.status(404).json({ message: "Không tìm thấy báo cáo." });
      return;
    }
    if (report.status !== "PENDING") {
      await connection.rollback();
      res.status(409).json({ message: "Báo cáo này đã được kết luận." });
      return;
    }
    if (status === "RESOLVED") {
      const [relatedReports] = await connection.execute<RowDataPacket[]>(
        "SELECT report_id, reporter_id FROM post_reports WHERE post_id = ? AND status = 'PENDING'",
        [report.post_id],
      );
      for (const related of relatedReports) {
        await connection.execute(
          "INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)",
          [
            related.reporter_id,
            "POST_REPORT_RESOLVED",
            "Báo cáo đã được xác nhận",
            "Quản trị viên đã xác nhận bài đăng vi phạm và gỡ bài khỏi danh sách công khai.",
            JSON.stringify({ post_id: Number(report.post_id), report_id: Number(related.report_id) }),
          ],
        );
      }
      await connection.execute("UPDATE posts SET status = 'HIDDEN' WHERE post_id = ?", [report.post_id]);
      await connection.execute(
        "UPDATE post_reports SET status = 'RESOLVED' WHERE post_id = ? AND status = 'PENDING'",
        [report.post_id],
      );
      const [strikes] = await connection.execute<RowDataPacket[]>(
        "SELECT COUNT(DISTINCT p.post_id) AS strike_count FROM post_reports r JOIN posts p ON p.post_id = r.post_id WHERE p.author_id = ? AND r.status = 'RESOLVED'",
        [owner.user_id],
      );
      const strikeCount = asNumber(strikes[0]?.strike_count);
      let sanction: string | null = null;
      let notification: { type: string; title: string; body: string } | null = null;
      if (strikeCount === 1) {
        sanction = "WARNING";
        notification = {
          type: "POST_VIOLATION_WARNING",
          title: "Cảnh báo vi phạm bài đăng",
          body: "Một bài đăng của bạn đã bị xác nhận vi phạm. Đây là cảnh cáo lần 1.",
        };
      } else if (strikeCount === 2) {
        sanction = "SEVEN_DAY_RESTRICTION";
        notification = {
          type: "POSTING_SUSPENDED",
          title: "Tạm khóa quyền đăng bài",
          body: "Bài đăng vi phạm lần thứ 2. Bạn không thể đăng bài mới trong 7 ngày; các bài đăng hiện có đã được tạm ẩn.",
        };
        await connection.execute(
          "UPDATE users SET status = 'WARNING', banned_until = DATE_ADD(NOW(), INTERVAL 7 DAY), ban_reason = ? WHERE user_id = ?",
          ["Tạm khóa quyền đăng bài do có 2 bài đăng vi phạm.", owner.user_id],
        );
        await connection.execute(
          "UPDATE posts SET status = 'HIDDEN' WHERE author_id = ? AND status <> 'HIDDEN'",
          [owner.user_id],
        );
      } else if (strikeCount >= 3) {
        sanction = "PERMANENT_BAN";
        notification = {
          type: "ACCOUNT_PERMANENTLY_BANNED",
          title: "Tài khoản đã bị khóa",
          body: "Tài khoản bị khóa vĩnh viễn do có từ 3 bài đăng vi phạm trở lên. Tất cả bài đăng đã bị ẩn.",
        };
        await connection.execute(
          "UPDATE users SET status = 'BANNED', banned_until = NULL, ban_reason = ? WHERE user_id = ?",
          ["Khóa vĩnh viễn do có từ 3 bài đăng vi phạm trở lên.", owner.user_id],
        );
        await connection.execute(
          "UPDATE posts SET status = 'HIDDEN' WHERE author_id = ? AND status <> 'HIDDEN'",
          [owner.user_id],
        );
      }
      if (notification) {
        await connection.execute(
          "INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)",
          [
            owner.user_id,
            notification.type,
            notification.title,
            notification.body,
            JSON.stringify({ post_id: Number(report.post_id), report_id: id, strike_count: strikeCount }),
          ],
        );
      }
      await connection.commit();
      res.json({
        success: true,
        data: { status, postStatus: "HIDDEN", strikeCount, sanction, pendingReportCount: 0 },
      });
      return;
    }
    await connection.execute<ResultSetHeader>(
      "UPDATE post_reports SET status = ? WHERE report_id = ?",
      [status, id],
    );
    await connection.execute(
      "INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)",
      [
        report.reporter_id,
        "POST_REPORT_DISMISSED",
        "Báo cáo đã được xem xét",
        "Quản trị viên đã xem xét và kết luận bài đăng không vi phạm.",
        JSON.stringify({ post_id: Number(report.post_id), report_id: id }),
      ],
    );
    const [remaining] = await connection.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS pending_count FROM post_reports WHERE post_id = ? AND status = 'PENDING'",
      [report.post_id],
    );
    const [autoHideMarkers] = await connection.execute<RowDataPacket[]>(
      "SELECT notification_id FROM notifications WHERE user_id = ? AND type = 'POST_AUTO_HIDDEN_REPORT_THRESHOLD' AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.post_id')) = ? ORDER BY created_at DESC LIMIT 1",
      [owner.user_id, String(report.post_id)],
    );
    const canRestore = asNumber(remaining[0]?.pending_count) === 0 &&
      Boolean(autoHideMarkers[0]) &&
      owner.status !== "BANNED" &&
      !Boolean(owner.posting_restricted);
    let postStatus: string | null = null;
    if (canRestore) {
      const [restored] = await connection.execute<ResultSetHeader>(
        "UPDATE posts SET status = 'AVAILABLE' WHERE post_id = ? AND status = 'HIDDEN' AND is_approved = 1",
        [report.post_id],
      );
      if (restored.affectedRows) {
        postStatus = "AVAILABLE";
        await connection.execute(
          "UPDATE notifications SET type = 'POST_AUTO_HIDE_RESTORED' WHERE notification_id = ?",
          [autoHideMarkers[0].notification_id],
        );
      }
    }
    await connection.commit();
    res.json({
      success: true,
      data: {
        status,
        postStatus,
        strikeCount: null,
        sanction: null,
        pendingReportCount: asNumber(remaining[0]?.pending_count),
      },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
});

app.get("/api/admin/landmarks", requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT landmark_id, name, category, address, latitude, longitude, created_at FROM landmarks ORDER BY created_at DESC",
    );
    res.json({
      items: rows.map((row) => ({
        id: asNumber(row.landmark_id),
        name: row.name,
        category: row.category,
        categoryLabel: landmarkCategoryLabel(row.category),
        address: row.address,
        latitude: asNumber(row.latitude),
        longitude: asNumber(row.longitude),
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/landmarks", requireAdmin, async (req, res, next) => {
  try {
    const { name, address, category, latitude, longitude } = req.body ?? {};
    if (!name || !address || !category || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      res.status(400).json({ message: "Thông tin địa điểm chưa đầy đủ." });
      return;
    }
    if (!["UNIVERSITY", "PARK", "MUSEUM", "HOSPITAL", "SHOPPING", "OTHER"].includes(category)) {
      res.status(400).json({ message: "Loại địa điểm không hợp lệ." });
      return;
    }
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO landmarks (name, category, address, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
      [name, category, address, Number(latitude), Number(longitude)],
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/landmarks/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ message: "Mã địa điểm không hợp lệ." });
      return;
    }
    const [result] = await pool.execute<ResultSetHeader>("DELETE FROM landmarks WHERE landmark_id = ?", [id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ message: "Không tìm thấy địa điểm." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/vip-revenue", requireAdmin, async (req, res, next) => {
  try {
    const period = getPeriod(req.query.period);
    const from = formatDate(periodStart(period));
    const [summaryRows] = await pool.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(price), 0) AS revenue, COUNT(*) AS purchases, COUNT(DISTINCT user_id) AS subscribers " +
        "FROM subscriptions WHERE created_at >= ? AND status <> 'CANCELLED'",
      [from],
    );
    const [activeRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS activeVips FROM users WHERE is_vip = 1 AND (vip_expires_at IS NULL OR vip_expires_at > NOW())",
    );
    const [trendRows] = await pool.query<RowDataPacket[]>(
      "SELECT DATE(created_at) AS date, COALESCE(SUM(price), 0) AS revenue, COUNT(*) AS purchases " +
        "FROM subscriptions WHERE created_at >= ? AND status <> 'CANCELLED' GROUP BY DATE(created_at) ORDER BY date ASC",
      [from],
    );
    const [planRows] = await pool.query<RowDataPacket[]>(
      "SELECT package_name AS name, COUNT(*) AS subscribers, COALESCE(SUM(price), 0) AS revenue " +
        "FROM subscriptions WHERE created_at >= ? AND status <> 'CANCELLED' GROUP BY package_name ORDER BY revenue DESC",
      [from],
    );
    const [subscriptionRows] = await pool.query<RowDataPacket[]>(
      "SELECT s.subscription_id, s.package_name, s.price, s.start_date, s.end_date, s.status, s.created_at, " +
        "u.user_id, u.full_name, u.email, u.avatar_url " +
        "FROM subscriptions s JOIN users u ON u.user_id = s.user_id " +
        "WHERE s.created_at >= ? ORDER BY s.created_at DESC LIMIT 50",
      [from],
    );

    const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "quarter" ? 90 : 365;
    const revenueByDate = new Map(trendRows.map((row) => [String(row.date).slice(0, 10), { revenue: asNumber(row.revenue), purchases: asNumber(row.purchases) }]));
    const trend = Array.from({ length: days }, (_, index) => {
      const date = new Date(periodStart(period));
      date.setDate(date.getDate() + index);
      const key = formatDate(date);
      const item = revenueByDate.get(key);
      return { date: key, revenue: item?.revenue ?? 0, purchases: item?.purchases ?? 0 };
    });

    res.json({
      period,
      summary: {
        revenue: asNumber(summaryRows[0]?.revenue),
        purchases: asNumber(summaryRows[0]?.purchases),
        subscribers: asNumber(summaryRows[0]?.subscribers),
        activeVips: asNumber(activeRows[0]?.activeVips),
      },
      trend,
      plans: planRows.map((row) => ({ name: row.name, subscribers: asNumber(row.subscribers), revenue: asNumber(row.revenue) })),
      subscriptions: subscriptionRows.map((row, index) => ({
        id: asNumber(row.subscription_id),
        userId: asNumber(row.user_id),
        user: { name: row.full_name, email: row.email, initials: initials(row.full_name), avatar: row.avatar_url, avatarTone: avatarTone(index) },
        packageName: row.package_name,
        price: asNumber(row.price),
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/vip-subscriptions", requireAdmin, async (req, res, next) => {
  let connection: PoolConnection | undefined;
  try {
    const userId = Number(req.body?.userId);
    const packageName = String(req.body?.packageName ?? "").trim();
    const price = Number(req.body?.price);
    const startDate = String(req.body?.startDate ?? "");
    const endDate = String(req.body?.endDate ?? "");
    const paymentMethod = String(req.body?.paymentMethod ?? "ADMIN_MANUAL");

    if (!Number.isInteger(userId) || !packageName || !Number.isFinite(price) || price <= 0 || !startDate || !endDate) {
      res.status(400).json({ message: "Thông tin đăng ký VIP chưa hợp lệ." });
      return;
    }
    if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
      res.status(400).json({ message: "Ngày kết thúc phải sau ngày bắt đầu." });
      return;
    }
    if (!["BANK_TRANSFER", "VIETQR", "ADMIN_MANUAL"].includes(paymentMethod)) {
      res.status(400).json({ message: "Phương thức thanh toán không hợp lệ." });
      return;
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [users] = await connection.execute<RowDataPacket[]>("SELECT user_id FROM users WHERE user_id = ? FOR UPDATE", [userId]);
    if (!users[0]) {
      await connection.rollback();
      res.status(404).json({ message: "Không tìm thấy người dùng." });
      return;
    }

    const code = "VIP-" + Date.now() + "-" + userId;
    await connection.execute(
      "INSERT INTO transactions (user_id, amount, payment_method, transaction_code, status) VALUES (?, ?, ?, ?, 'SUCCESS')",
      [userId, price, paymentMethod, code],
    );
    const [subscription] = await connection.execute<ResultSetHeader>(
      "INSERT INTO subscriptions (user_id, package_name, price, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')",
      [userId, packageName, price, startDate, endDate],
    );
    await connection.execute(
      "UPDATE users SET is_vip = 1, vip_expires_at = GREATEST(COALESCE(vip_expires_at, ?), ?) WHERE user_id = ?",
      [endDate, endDate, userId],
    );
    await connection.commit();
    res.status(201).json({ id: subscription.insertId, transactionCode: code });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Không thể xử lý yêu cầu. Vui lòng thử lại." });
});

app.listen(port, () => {
  console.log("HubStay admin API is listening on port " + port);
});
