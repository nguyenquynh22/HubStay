const db = require('../common/db');

class saved_postsRepository {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM saved_posts');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM saved_posts WHERE user_id = ?', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query('INSERT INTO saved_posts SET ?', [data]);
    return { user_id: result.insertId, ...data };
  }

  static async update(id, data) {
    await db.query('UPDATE saved_posts SET ? WHERE user_id = ?', [data, id]);
    return { user_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM saved_posts WHERE user_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = saved_postsRepository;
