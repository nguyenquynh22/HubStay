const db = require("../common/db");

class verification_requestsRepository {
  static async getAll() {
    const [rows] = await db.query(
      "SELECT * FROM verification_requests ORDER BY created_at DESC",
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query(
      "SELECT * FROM verification_requests WHERE request_id = ?",
      [id],
    );
    return rows[0] || null;
  }

  static async getByUserId(userId) {
    const [rows] = await db.query(
      "SELECT * FROM verification_requests WHERE user_id = ? ORDER BY created_at DESC",
      [userId],
    );
    return rows;
  }

  static async create(data) {
    const payload = {
      ...data,
      status: data.status || "PENDING",
      created_at: data.created_at || new Date(),
    };
    const [result] = await db.query("INSERT INTO verification_requests SET ?", [
      payload,
    ]);
    return { request_id: result.insertId, ...payload };
  }

  static async update(id, data) {
    await db.query("UPDATE verification_requests SET ? WHERE request_id = ?", [
      data,
      id,
    ]);
    return { request_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query(
      "DELETE FROM verification_requests WHERE request_id = ?",
      [id],
    );
    return result.affectedRows > 0;
  }
}

module.exports = verification_requestsRepository;
