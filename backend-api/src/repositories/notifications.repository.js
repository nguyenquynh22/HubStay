const db = require("../common/db");

class NotificationsRepository {
  static async getByUserId(userId, limit = 50) {
    const [rows] = await db.query(
      `SELECT notification_id, user_id, type, title, body, data, is_read, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit],
    );
    return rows;
  }

  static async create(notification) {
    const [result] = await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES (?, ?, ?, ?, ?)`,
      [
        notification.user_id,
        notification.type,
        notification.title,
        notification.body,
        notification.data ? JSON.stringify(notification.data) : null,
      ],
    );
    return { notification_id: result.insertId, ...notification, is_read: 0 };
  }

  static async markRead(userId, notificationId) {
    const [result] = await db.query(
      "UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?",
      [notificationId, userId],
    );
    return result.affectedRows > 0;
  }

  static async markAllRead(userId) {
    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
      [userId],
    );
  }
}

module.exports = NotificationsRepository;
