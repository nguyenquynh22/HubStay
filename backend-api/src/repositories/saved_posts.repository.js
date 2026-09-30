const db = require("../common/db");

class SavedPostsRepository {
  static async getAll() {
    const [rows] = await db.query("SELECT * FROM saved_posts");
    return rows;
  }
  static async getByUserId(userId) {
    const [rows] = await db.query(
      `SELECT p.*, p.author_id AS user_id, p.post_type AS type, p.address_detail AS address, p.post_lat AS latitude, p.post_lng AS longitude,
      (SELECT image_url FROM post_images pi WHERE pi.post_id = p.post_id ORDER BY pi.is_cover DESC, pi.image_id LIMIT 1) AS image_url,
      u.full_name AS author_name, u.is_verified, u.is_vip, s.created_at AS saved_at
      FROM saved_posts s JOIN posts p ON p.post_id = s.post_id LEFT JOIN users u ON u.user_id = p.author_id
      WHERE s.user_id = ? ORDER BY s.created_at DESC`,
      [userId],
    );
    return rows;
  }
  static async has(userId, postId) {
    const [rows] = await db.query(
      "SELECT 1 FROM saved_posts WHERE user_id = ? AND post_id = ?",
      [userId, postId],
    );
    return rows.length > 0;
  }
  static async toggle(userId, postId) {
    if (await this.has(userId, postId)) {
      await db.query(
        "DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?",
        [userId, postId],
      );
      return { saved: false };
    }
    await db.query("INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)", [
      userId,
      postId,
    ]);
    return { saved: true };
  }
}

module.exports = SavedPostsRepository;
