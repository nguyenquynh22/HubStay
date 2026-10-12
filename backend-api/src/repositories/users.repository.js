const db = require("../common/db");

class usersRepository {
  static async getAll({ search = "", role = "", status = "", verified = "", page = 1, limit = 20 } = {}) {
    const conditions = ["role <> 'ADMIN'"];
    const values = [];

    if (search) {
      conditions.push("(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)");
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (role) {
      conditions.push("role = ?");
      values.push(role);
    }
    if (status === "WARNING") {
      conditions.push("(status = 'WARNING' OR (status <> 'BANNED' AND EXISTS (SELECT 1 FROM post_reports r JOIN posts p ON p.post_id = r.post_id WHERE p.author_id = users.user_id AND r.status = 'RESOLVED')))");
    } else if (status === "ACTIVE") {
      conditions.push("status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM post_reports r JOIN posts p ON p.post_id = r.post_id WHERE p.author_id = users.user_id AND r.status = 'RESOLVED')");
    } else if (status) {
      conditions.push("status = ?");
      values.push(status);
    }
    if (verified !== "") {
      conditions.push("is_verified = ?");
      values.push(verified === "true" ? 1 : 0);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM users ${where}`, values);
    const [rows] = await db.query(
      "SELECT user_id, full_name, email, phone, role, avatar_url, is_verified, is_vip, vip_expires_at, " +
        "CASE WHEN status = 'ACTIVE' AND EXISTS (SELECT 1 FROM post_reports r JOIN posts p ON p.post_id = r.post_id WHERE p.author_id = users.user_id AND r.status = 'RESOLVED') THEN 'WARNING' ELSE status END AS status, " +
        "banned_until, ban_reason, " +
        "(SELECT COUNT(DISTINCT r.post_id) FROM post_reports r JOIN posts p ON p.post_id = r.post_id WHERE p.author_id = users.user_id AND r.status = 'RESOLVED') AS report_strike_count, " +
        "created_at, updated_at " +
        `FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, limit, (page - 1) * limit],
    );
    const [summaryRows] = await db.query(
      "SELECT COUNT(*) AS total, " +
        "SUM(status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM post_reports r JOIN posts p ON p.post_id = r.post_id WHERE p.author_id = users.user_id AND r.status = 'RESOLVED')) AS active, " +
        "SUM(is_verified = 0) AS unverified, " +
        "SUM(status IN ('WARNING', 'BANNED') OR EXISTS (SELECT 1 FROM post_reports r JOIN posts p ON p.post_id = r.post_id WHERE p.author_id = users.user_id AND r.status = 'RESOLVED')) AS restricted, " +
        "SUM(role = 'STUDENT') AS students, " +
        "SUM(role = 'LANDLORD') AS landlords " +
        "FROM users WHERE role <> 'ADMIN'",
    );

    return {
      items: rows.map((row) => ({
        ...row,
        report_strike_count: Number(row.report_strike_count ?? 0),
      })),
      total: Number(countRows[0]?.total ?? 0),
      summary: summaryRows[0],
    };
  }

  static async getById(id) {
    const [rows] = await db.query(
      "SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.avatar_url, u.is_verified, u.is_vip, " +
        "u.vip_expires_at, u.status, u.banned_until, u.ban_reason, u.created_at, u.updated_at, " +
        "(SELECT COUNT(*) FROM posts p WHERE p.author_id = u.user_id) AS post_count, " +
        "(SELECT COUNT(*) FROM posts p WHERE p.author_id = u.user_id AND p.status = 'AVAILABLE' AND p.is_approved = 1) AS active_post_count, " +
        "(SELECT COUNT(*) FROM subscriptions s WHERE s.user_id = u.user_id AND s.status = 'ACTIVE' AND s.end_date >= NOW()) AS active_subscription_count, " +
        "(SELECT COUNT(DISTINCT r.post_id) FROM post_reports r JOIN posts p ON p.post_id = r.post_id WHERE p.author_id = u.user_id AND r.status = 'RESOLVED') AS report_strike_count " +
        "FROM users u WHERE u.user_id = ? AND u.role <> 'ADMIN'",
      [id],
    );
    if (!rows[0]) return null;

    const [[verificationRows], [reportRows]] = await Promise.all([
      db.query(
      "SELECT request_id, account_type, status, rejection_reason, created_at, reviewed_at " +
        "FROM verification_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [id],
      ),
      db.query(
        "SELECT r.report_id, r.post_id, r.reason, r.description, r.status, r.created_at, p.title AS post_title, " +
          "(SELECT n.body FROM notifications n WHERE n.user_id = r.reporter_id AND n.type = 'POST_REPORT_DECISION_REVERSED' AND JSON_UNQUOTE(JSON_EXTRACT(n.data, '$.report_id')) = CAST(r.report_id AS CHAR) ORDER BY n.created_at DESC LIMIT 1) AS reversal_note " +
          "FROM post_reports r JOIN posts p ON p.post_id = r.post_id WHERE p.author_id = ? ORDER BY r.created_at DESC",
        [id],
      ),
    ]);
    const user = rows[0];
    if (user.status === "ACTIVE" && Number(user.report_strike_count) > 0) {
      user.status = "WARNING";
    }
    return {
      ...user,
      violation_reports: reportRows.map((report) => ({
        report_id: Number(report.report_id),
        post_id: Number(report.post_id),
        post_title: report.post_title,
        reason: report.reason,
        description: report.description,
        status: report.status,
        created_at: report.created_at,
        decision_reversed: Boolean(report.reversal_note),
        reversal_note: report.reversal_note ?? null,
      })),
      latest_verification: verificationRows[0] ?? null,
    };
  }
  
  static async getPublicById(id) {
    const [rows] = await db.query(
      "SELECT user_id, full_name, email, phone, role, avatar_url, is_verified, is_vip, vip_expires_at, status, created_at " +
        "FROM users WHERE user_id = ?",
      [id],
    );
    return rows[0] || null;
  }

  static async getByEmail(email) {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    return rows[0] || null;
  }

  static async getByPhone(phone) {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE phone = ? LIMIT 1",
      [phone],
    );
    return rows[0] || null;
  }

  static async create(data) {
    const sql = `
      INSERT INTO users (
        full_name, email, phone, password_hash, role, avatar_url,
        is_verified, is_vip, vip_expires_at, status, banned_until, ban_reason
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.full_name,
      data.email,
      data.phone || null,
      data.password_hash,
      data.role || "STUDENT",
      data.avatar_url || null,
      data.is_verified ?? 0,
      data.is_vip ?? 0,
      data.vip_expires_at || null,
      data.status || "ACTIVE",
      data.banned_until || null,
      data.ban_reason || null,
    ];

    const [result] = await db.query(sql, values);
    return this.getById(result.insertId);
  }

  static async update(id, data) {
    const columns = {
      full_name: "full_name",
      email: "email",
      phone: "phone",
      password_hash: "password_hash",
      role: "role",
      avatar_url: "avatar_url",
      status: "status",
      banned_until: "banned_until",
      ban_reason: "ban_reason",
      is_verified: "is_verified",
      verified_at: "verified_at",
      kyc_status: "kyc_status",
      is_vip: "is_vip",
      vip_expires_at: "vip_expires_at",
    };
    const entries = Object.entries(data).filter(([key]) => columns[key]);
    if (!entries.length) return this.getById(id);

    const assignments = entries.map(([key]) => `${columns[key]} = ?`).join(", ");
    await db.query(`UPDATE users SET ${assignments} WHERE user_id = ? AND role <> 'ADMIN'`, [
      ...entries.map(([, value]) => value),
      id,
    ]);
    return this.getById(id);
  }

  static async delete(id) {
    const [result] = await db.query("DELETE FROM users WHERE user_id = ? AND role <> 'ADMIN'", [id]);
    return result.affectedRows > 0;
  }
}

module.exports = usersRepository;
