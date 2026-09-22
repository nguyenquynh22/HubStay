const db = require('../common/db');

class post_imagesRepository {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM post_images');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM post_images WHERE image_id = ?', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query('INSERT INTO post_images SET ?', [data]);
    return { image_id: result.insertId, ...data };
  }

  static async update(id, data) {
    await db.query('UPDATE post_images SET ? WHERE image_id = ?', [data, id]);
    return { image_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM post_images WHERE image_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = post_imagesRepository;
