const db = require("../common/db");

class TransactionsRepository {
  static async getAll() {
    const sql = `
      SELECT t.*, u.full_name, u.email
      FROM transactions t
      JOIN users u ON t.user_id = u.user_id
      ORDER BY t.created_at DESC
    `;
    const [rows] = await db.query(sql);
    return rows;
  }

  static async getById(id) {
    const sql = `
      SELECT t.*, u.full_name, u.email
      FROM transactions t
      JOIN users u ON t.user_id = u.user_id
      WHERE t.transaction_id = ?
    `;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  }

  static async getByCode(code) {
    const [rows] = await db.query("SELECT * FROM transactions WHERE transaction_code = ?", [code]);
    return rows[0] || null;
  }

  static async getByUserId(userId) {
    const sql = `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`;
    const [rows] = await db.query(sql, [userId]);
    return rows;
  }

  static async create(data) {
    const sql = `
      INSERT INTO transactions (user_id, amount, payment_method, transaction_code, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [
      data.user_id,
      data.amount,
      data.payment_method || "VIETQR",
      data.transaction_code,
      data.status || "PENDING",
    ];
    const [result] = await db.query(sql, values);
    return { transaction_id: result.insertId, ...data };
  }

  static async updateStatus(id, status) {
    const sql = `UPDATE transactions SET status = ? WHERE transaction_id = ?`;
    const [result] = await db.query(sql, [status, id]);
    return result.affectedRows > 0;
  }
}

module.exports = TransactionsRepository;