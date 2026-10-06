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
    if (status) {
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
      "SELECT user_id, full_name, email, phone, role, avatar_url, is_verified, is_vip, vip_expires_at, status, banned_until, ban_reason, created_at, updated_at " +
        `FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, limit, (page - 1) * limit],
    );
    const [summaryRows] = await db.query(
      "SELECT COUNT(*) AS total, " +
        "SUM(status = 'ACTIVE') AS active, " +
        "SUM(is_verified = 0) AS unverified, " +
        "SUM(status IN ('WARNING', 'BANNED')) AS restricted, " +
        "SUM(role = 'STUDENT') AS students, " +
        "SUM(role = 'LANDLORD') AS landlords " +
        "FROM users WHERE role <> 'ADMIN'",
    );

    return {
      items: rows,
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
        "(SELECT COUNT(*) FROM subscriptions s WHERE s.user_id = u.user_id AND s.status = 'ACTIVE' AND s.end_date >= NOW()) AS active_subscription_count " +
        "FROM users u WHERE u.user_id = ? AND u.role <> 'ADMIN'",
      [id],
    );
    if (!rows[0]) return null;

    const [verificationRows] = await db.query(
      "SELECT request_id, account_type, status, rejection_reason, created_at, reviewed_at " +
        "FROM verification_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [id],
    );
    return { ...rows[0], latest_verification: verificationRows[0] ?? null };
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
