const db = require("../common/db");

class usersRepository {
  static async getAll() {
    const [rows] = await db.query("SELECT * FROM users");
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query("SELECT * FROM users WHERE user_id = ?", [
      id,
    ]);
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

  // Khai báo rõ ràng các cột INSERT để tránh bị lọt key thừa gây lỗi SQL
  static async create(data) {
    const sql = `
      INSERT INTO users (
        full_name, email, phone, password_hash, role, avatar_url,
        is_verified, is_vip, vip_expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    ];

    const [result] = await db.query(sql, values);
    return { user_id: result.insertId, ...data };
  }

  static async update(id, data) {
    await db.query("UPDATE users SET ? WHERE user_id = ?", [data, id]);
    return { user_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query("DELETE FROM users WHERE user_id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  }
}

module.exports = usersRepository;
