const db = require('../common/db');

class post_reactionsRepository {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM post_reactions');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM post_reactions WHERE user_id = ?', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query('INSERT INTO post_reactions SET ?', [data]);
    return { user_id: result.insertId, ...data };
  }

  static async update(id, data) {
    await db.query('UPDATE post_reactions SET ? WHERE user_id = ?', [data, id]);
    return { user_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM post_reactions WHERE user_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = post_reactionsRepository;
