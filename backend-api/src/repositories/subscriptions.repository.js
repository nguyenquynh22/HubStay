const db = require("../common/db");

class SubscriptionsRepository {
  static async getAll() {
    const sql = `
      SELECT s.*, u.full_name, u.email
      FROM subscriptions s
      JOIN users u ON s.user_id = u.user_id
      ORDER BY s.created_at DESC
    `;
    const [rows] = await db.query(sql);
    return rows;
  }

  static async getById(id) {
    const sql = `
      SELECT s.*, u.full_name, u.email
      FROM subscriptions s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.subscription_id = ?
    `;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  }

  static async getByUserId(userId) {
    const sql = `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC`;
    const [rows] = await db.query(sql, [userId]);
    return rows;
  }

  static async create(data) {
    const sql = `
      INSERT INTO subscriptions (user_id, package_name, price, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.user_id,
      data.package_name,
      data.price,
      data.start_date,
      data.end_date,
      data.status || "ACTIVE",
    ];
    const [result] = await db.query(sql, values);
    return { subscription_id: result.insertId, ...data };
  }

  static async updateStatus(id, status) {
    const sql = `UPDATE subscriptions SET status = ? WHERE subscription_id = ?`;
    const [result] = await db.query(sql, [status, id]);
    return result.affectedRows > 0;
  }
}

module.exports = SubscriptionsRepository;