const db = require('../common/db');

class postsRepository {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM posts');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM posts WHERE post_id = ?', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query('INSERT INTO posts SET ?', [data]);
    return { post_id: result.insertId, ...data };
  }

  static async update(id, data) {
    await db.query('UPDATE posts SET ? WHERE post_id = ?', [data, id]);
    return { post_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM posts WHERE post_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = postsRepository;
