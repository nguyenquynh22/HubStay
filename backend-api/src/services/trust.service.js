const db = require("../common/db");

class TrustService {
  static async getUserTrustSummary(userId) {
    const [rows] = await db.query(
      `
        SELECT 
          u.user_id,
          u.is_verified,
          u.is_vip,
          u.vip_expires_at,
          CASE 
            WHEN u.is_vip = 1 AND (u.vip_expires_at IS NULL OR u.vip_expires_at > NOW()) THEN 1
            ELSE 0
          END AS is_vip_active,
          CASE
            WHEN u.is_verified = 1 THEN 1
            ELSE 0
          END AS is_verified_active
        FROM users u
        WHERE u.user_id = ?
      `,
      [userId],
    );

    return rows[0] || null;
  }

  static async syncVipStatusFromSubscription(userId) {
    const [rows] = await db.query(
      `
        SELECT *
        FROM subscriptions
        WHERE user_id = ?
        ORDER BY end_date DESC
        LIMIT 1
      `,
      [userId],
    );

    const latest = rows[0];
    const isVipActive =
      !!latest &&
      latest.status === "ACTIVE" &&
      new Date(latest.end_date) > new Date();

    await db.query(
      `
        UPDATE users
        SET is_vip = ?, vip_expires_at = ?
        WHERE user_id = ?
      `,
      [isVipActive ? 1 : 0, isVipActive ? latest.end_date : null, userId],
    );

    return { isVipActive, vipExpiresAt: isVipActive ? latest.end_date : null };
  }
}

module.exports = TrustService;
