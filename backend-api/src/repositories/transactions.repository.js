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
    const [rows] = await db.query(
      "SELECT * FROM transactions WHERE transaction_code = ?",
      [code],
    );
    return rows[0] || null;
  }

  static async getByUserId(userId) {
    const sql = `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`;
    const [rows] = await db.query(sql, [userId]);
    return rows;
  }

  static async create(data) {
    const sql = `
      INSERT INTO transactions (user_id, transaction_type, amount, payment_method, transaction_code, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.user_id,
      data.transaction_type || "TOP_UP",
      data.amount,
      data.payment_method || "VIETQR",
      data.transaction_code,
      data.status || "PENDING",
    ];
    const [result] = await db.query(sql, values);
    return { transaction_id: result.insertId, ...data };
  }

  static async completeTopUp(id) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        "SELECT user_id, amount, transaction_type, status FROM transactions WHERE transaction_id = ? FOR UPDATE",
        [id],
      );
      const transaction = rows[0];
      if (!transaction) {
        await connection.rollback();
        return { error: "TRANSACTION_NOT_FOUND" };
      }
      if (transaction.transaction_type !== "TOP_UP") {
        await connection.rollback();
        return { error: "NOT_TOP_UP" };
      }
      if (transaction.status === "SUCCESS") {
        await connection.rollback();
        return { alreadyCompleted: true };
      }
      if (transaction.status !== "PENDING") {
        await connection.rollback();
        return { error: "TRANSACTION_NOT_PENDING" };
      }
      await connection.query(
        "UPDATE transactions SET status = 'SUCCESS' WHERE transaction_id = ?",
        [id],
      );
      await connection.query(
        "UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?",
        [transaction.amount, transaction.user_id],
      );
      const [users] = await connection.query(
        "SELECT wallet_balance FROM users WHERE user_id = ?",
        [transaction.user_id],
      );
      await connection.commit();
      return {
        transaction_id: Number(id),
        status: "SUCCESS",
        wallet_balance: users[0]?.wallet_balance,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updateStatus(id, status) {
    const sql = `UPDATE transactions SET status = ? WHERE transaction_id = ?`;
    const [result] = await db.query(sql, [status, id]);
    return result.affectedRows > 0;
  }
}

module.exports = TransactionsRepository;
