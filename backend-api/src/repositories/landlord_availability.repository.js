const db = require('../common/db');

class landlord_availabilityRepository {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM landlord_availability');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM landlord_availability WHERE availability_id = ?', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query('INSERT INTO landlord_availability SET ?', [data]);
    return { availability_id: result.insertId, ...data };
  }

  static async update(id, data) {
    await db.query('UPDATE landlord_availability SET ? WHERE availability_id = ?', [data, id]);
    return { availability_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM landlord_availability WHERE availability_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = landlord_availabilityRepository;
