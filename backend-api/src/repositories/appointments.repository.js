const db = require("../common/db");

class appointmentsRepository {
  static async getForLandlord(landlordId, order = "DESC") {
    const sortOrder = order === "ASC" ? "ASC" : "DESC";
    const [rows] = await db.query(
      `SELECT a.*, p.author_id AS landlord_id, p.title AS post_title,
              p.address_detail AS post_address,
              COALESCE(a.guest_name, u.full_name) AS tenant_name,
              COALESCE(a.guest_phone, u.phone) AS tenant_phone
       FROM appointments a
       JOIN posts p ON p.post_id = a.post_id
       LEFT JOIN users u ON u.user_id = a.tenant_id
       WHERE p.author_id = ?
       ORDER BY a.created_at ${sortOrder}, a.appointment_date ${sortOrder},
                a.appointment_time ${sortOrder}`,
      [landlordId],
    );
    return rows;
  }

  static async getForTenant(tenantId, order = "DESC") {
    const sortOrder = order === "ASC" ? "ASC" : "DESC";
    const [rows] = await db.query(
      `SELECT a.*, p.title AS post_title, p.address_detail AS post_address,
              p.author_id AS landlord_id, u.full_name AS landlord_name
       FROM appointments a
       JOIN posts p ON p.post_id = a.post_id
       JOIN users u ON u.user_id = p.author_id
       WHERE a.tenant_id = ?
       ORDER BY a.created_at ${sortOrder}, a.appointment_date ${sortOrder},
                a.appointment_time ${sortOrder}`,
      [tenantId],
    );
    return rows;
  }

  static async getPost(postId) {
    const [rows] = await db.query(
      "SELECT post_id, author_id, title, enable_booking, status FROM posts WHERE post_id = ?",
      [postId],
    );
    return rows[0] || null;
  }

  static async getById(id) {
    const [rows] = await db.query(
      `SELECT a.*, p.author_id AS landlord_id
       FROM appointments a JOIN posts p ON p.post_id = a.post_id
       WHERE a.appointment_id = ?`,
      [id],
    );
    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query(
      `INSERT INTO appointments
         (post_id, tenant_id, source, guest_name, guest_phone,
          appointment_date, appointment_time, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.post_id,
        data.tenant_id,
        data.source,
        data.guest_name,
        data.guest_phone,
        data.appointment_date,
        data.appointment_time,
        data.note || null,
        data.status,
      ],
    );
    return { appointment_id: result.insertId, ...data };
  }

  static async update(id, data) {
    const columns = [];
    const values = [];
    for (const key of [
      "appointment_date",
      "appointment_time",
      "note",
      "status",
    ]) {
      if (data[key] !== undefined) {
        columns.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (!columns.length) return false;
    values.push(id);
    const [result] = await db.query(
      `UPDATE appointments SET ${columns.join(", ")} WHERE appointment_id = ?`,
      values,
    );
    return result.affectedRows > 0;
  }
}

module.exports = appointmentsRepository;
