const db = require('../common/db');

class landmarksRepository {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM landmarks');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM landmarks WHERE landmark_id = ?', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query('INSERT INTO landmarks SET ?', [data]);
    return { landmark_id: result.insertId, ...data };
  }

  static async update(id, data) {
    await db.query('UPDATE landmarks SET ? WHERE landmark_id = ?', [data, id]);
    return { landmark_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM landmarks WHERE landmark_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = landmarksRepository;
