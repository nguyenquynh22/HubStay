const db = require('../common/db');

class verification_requestsRepository {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM verification_requests');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM verification_requests WHERE request_id = ?', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query('INSERT INTO verification_requests SET ?', [data]);
    return { request_id: result.insertId, ...data };
  }

  static async update(id, data) {
    await db.query('UPDATE verification_requests SET ? WHERE request_id = ?', [data, id]);
    return { request_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM verification_requests WHERE request_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = verification_requestsRepository;
