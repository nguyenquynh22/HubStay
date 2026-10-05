const Repo = require("../repositories/notifications.repository");

class NotificationsService {
  static async notify(userId, type, title, body, data = null) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) return null;
    try {
      return await Repo.create({ user_id: id, type, title, body, data });
    } catch (error) {
      console.error("Notification delivery failed:", error.message);
      return null;
    }
  }
}

module.exports = NotificationsService;
