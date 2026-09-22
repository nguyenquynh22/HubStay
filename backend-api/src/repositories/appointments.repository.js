const db = require('../common/db');

class appointmentsRepository {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM appointments');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM appointments WHERE appointment_id = ?', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query('INSERT INTO appointments SET ?', [data]);
    return { appointment_id: result.insertId, ...data };
  }

  static async update(id, data) {
    await db.query('UPDATE appointments SET ? WHERE appointment_id = ?', [data, id]);
    return { appointment_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM appointments WHERE appointment_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = appointmentsRepository;
