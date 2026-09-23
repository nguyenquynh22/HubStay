const db = require("../common/db");

class RentalRequestsRepository {
  static async getAll() {
    const sql = `
      SELECT r.*, p.title AS post_title, u.full_name AS tenant_name, u.phone AS tenant_phone
      FROM rental_requests r
      LEFT JOIN posts p ON r.post_id = p.post_id
      LEFT JOIN users u ON r.tenant_id = u.user_id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.query(sql);
    return rows;
  }

  static async getById(id) {
    const sql = `
      SELECT r.*, p.title AS post_title, u.full_name AS tenant_name, u.phone AS tenant_phone
      FROM rental_requests r
      LEFT JOIN posts p ON r.post_id = p.post_id
      LEFT JOIN users u ON r.tenant_id = u.user_id
      WHERE r.request_id = ?
    `;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  }

  static async getByPostId(postId) {
    const sql = `
      SELECT r.*, u.full_name AS tenant_name, u.phone AS tenant_phone, u.avatar_url
      FROM rental_requests r
      LEFT JOIN users u ON r.tenant_id = u.user_id
      WHERE r.post_id = ?
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.query(sql, [postId]);
    return rows;
  }

  static async getByTenantId(tenantId) {
    const sql = `
      SELECT r.*, p.title AS post_title, p.price, p.address
      FROM rental_requests r
      JOIN posts p ON r.post_id = p.post_id
      WHERE r.tenant_id = ?
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.query(sql, [tenantId]);
    return rows;
  }

  static async create(data) {
    const sql = `
      INSERT INTO rental_requests (post_id, tenant_id, status, note)
      VALUES (?, ?, ?, ?)
    `;
    const values = [
      data.post_id,
      data.tenant_id || null,
      data.status || "PENDING",
      data.note || null,
    ];
    const [result] = await db.query(sql, values);
    return { request_id: result.insertId, ...data };
  }

  static async updateStatus(id, status) {
    const sql = `UPDATE rental_requests SET status = ? WHERE request_id = ?`;
    const [result] = await db.query(sql, [status, id]);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.query("DELETE FROM rental_requests WHERE request_id = ?", [id]);
    return result.affectedRows > 0;
  }
}

module.exports = RentalRequestsRepository;