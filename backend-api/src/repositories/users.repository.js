const db = require('../common/db');

class usersRepository {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM users');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query('INSERT INTO users SET ?', [data]);
    return { user_id: result.insertId, ...data };
  }

  static async update(id, data) {
    await db.query('UPDATE users SET ? WHERE user_id = ?', [data, id]);
    return { user_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM users WHERE user_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = usersRepository;
