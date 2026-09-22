const db = require('../common/db');

class post_reportsRepository {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM post_reports');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM post_reports WHERE report_id = ?', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query('INSERT INTO post_reports SET ?', [data]);
    return { report_id: result.insertId, ...data };
  }

  static async update(id, data) {
    await db.query('UPDATE post_reports SET ? WHERE report_id = ?', [data, id]);
    return { report_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM post_reports WHERE report_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = post_reportsRepository;
