const db = require("../common/db");

class landmarksRepository {
  static async getAll() {
    const [rows] = await db.query("SELECT * FROM landmarks");
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query(
      "SELECT * FROM landmarks WHERE landmark_id = ?",
      [id],
    );
    return rows[0] || null;
  }

  static async create(data) {
    const sql = `
      INSERT INTO landmarks (name, category, address, latitude, longitude)
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [
      data.name,
      data.category || "OTHER",
      data.address,
      data.latitude || 0,
      data.longitude || 0,
    ];

    const [result] = await db.query(sql, values);
    return { landmark_id: result.insertId, ...data };
  }

  static async update(id, data) {
    // Loại bỏ landmark_id hoặc created_at nếu client lỡ truyền lên trong body
    const { landmark_id, created_at, ...updateFields } = data;

    const [result] = await db.query(
      "UPDATE landmarks SET ? WHERE landmark_id = ?",
      [updateFields, id],
    );
    return { landmark_id: id, ...updateFields };
  }

  static async delete(id) {
    const [result] = await db.query(
      "DELETE FROM landmarks WHERE landmark_id = ?",
      [id],
    );
    return result.affectedRows > 0;
  }
}

module.exports = landmarksRepository;
