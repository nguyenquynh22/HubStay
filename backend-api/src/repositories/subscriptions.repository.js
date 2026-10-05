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

  static async purchaseWithWallet(data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.query(
        "SELECT user_id, role, is_verified, wallet_balance, vip_expires_at FROM users WHERE user_id = ? FOR UPDATE",
        [data.user_id],
      );
      const user = users[0];
      if (!user) {
        await connection.rollback();
        return { error: "USER_NOT_FOUND" };
      }
      if (user.role !== "LANDLORD") {
        await connection.rollback();
        return { error: "LANDLORD_ONLY" };
      }
      if (Number(user.is_verified) !== 1) {
        await connection.rollback();
        return { error: "KYC_REQUIRED" };
      }
      if (Number(user.wallet_balance) < Number(data.price)) {
        await connection.rollback();
        return { error: "INSUFFICIENT_BALANCE" };
      }

      const now = new Date();
      const activeExpiry = user.vip_expires_at
        ? new Date(user.vip_expires_at)
        : null;
      const startDate = activeExpiry && activeExpiry > now ? activeExpiry : now;
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + data.months);
      await connection.query(
        "UPDATE users SET wallet_balance = wallet_balance - ?, is_vip = 1, vip_expires_at = ? WHERE user_id = ?",
        [data.price, endDate, data.user_id],
      );
      const [transactionResult] = await connection.query(
        `INSERT INTO transactions
          (user_id, transaction_type, amount, payment_method, transaction_code, status)
         VALUES (?, 'VIP_PURCHASE', ?, 'WALLET', ?, 'SUCCESS')`,
        [data.user_id, data.price, data.transaction_code],
      );
      const [subscriptionResult] = await connection.query(
        `INSERT INTO subscriptions
          (user_id, transaction_id, package_name, price, start_date, end_date, status)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [
          data.user_id,
          transactionResult.insertId,
          data.package_name,
          data.price,
          startDate,
          endDate,
        ],
      );
      const [balanceRows] = await connection.query(
        "SELECT wallet_balance FROM users WHERE user_id = ?",
        [data.user_id],
      );
      await connection.commit();
      return {
        subscription_id: subscriptionResult.insertId,
        transaction_id: transactionResult.insertId,
        user_id: Number(data.user_id),
        package_name: data.package_name,
        price: data.price,
        start_date: startDate,
        end_date: endDate,
        status: "ACTIVE",
        wallet_balance: balanceRows[0]?.wallet_balance,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updateStatus(id, status) {
    const sql = `UPDATE subscriptions SET status = ? WHERE subscription_id = ?`;
    const [result] = await db.query(sql, [status, id]);
    return result.affectedRows > 0;
  }
}

module.exports = SubscriptionsRepository;
