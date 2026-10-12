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
      WHERE s.user_id = ? AND p.status = 'AVAILABLE' AND p.is_approved = 1
      ORDER BY s.created_at DESC`,
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
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [posts] = await connection.query(
        "SELECT author_id, status, is_approved FROM posts WHERE post_id = ? FOR UPDATE",
        [postId],
      );
      const post = posts[0];
      if (!post) {
        await connection.rollback();
        return { error: "POST_NOT_FOUND" };
      }
      if (Number(post.author_id) === Number(userId)) {
        await connection.rollback();
        return { error: "OWN_POST" };
      }
      if (post.status !== "AVAILABLE" || Number(post.is_approved) !== 1) {
        await connection.rollback();
        return { error: "POST_UNAVAILABLE" };
      }
      const [savedRows] = await connection.query(
        "SELECT post_id FROM saved_posts WHERE user_id = ? AND post_id = ? FOR UPDATE",
        [userId, postId],
      );
      if (savedRows.length) {
        await connection.query(
          "DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?",
          [userId, postId],
        );
        await connection.commit();
        return { saved: false };
      }
      await connection.query(
        "INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)",
        [userId, postId],
      );
      await connection.commit();
      return { saved: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = SavedPostsRepository;
