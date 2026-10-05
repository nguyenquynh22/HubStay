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

  static async review(id, status, reviewerNote, reviewerId = null) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        "SELECT request_id, user_id, status FROM verification_requests WHERE request_id = ? FOR UPDATE",
        [id],
      );
      const request = rows[0];
      if (!request) {
        await connection.rollback();
        return { error: "REQUEST_NOT_FOUND" };
      }
      if (request.status !== "PENDING") {
        await connection.rollback();
        return { error: "REQUEST_NOT_PENDING" };
      }
      const verified = status === "APPROVED";
      const now = new Date();
      await connection.query(
        `UPDATE verification_requests
         SET status = ?, reviewed_by = ?, reviewed_at = ?, reviewer_note = ?, rejection_reason = ?
         WHERE request_id = ?`,
        [
          status,
          reviewerId,
          now,
          reviewerNote,
          verified ? null : reviewerNote,
          id,
        ],
      );
      await connection.query(
        "UPDATE users SET is_verified = ?, verified_at = ?, kyc_status = ? WHERE user_id = ?",
        [verified ? 1 : 0, verified ? now : null, status, request.user_id],
      );
      await connection.commit();
      return {
        request_id: Number(id),
        user_id: Number(request.user_id),
        status,
        reviewer_note: reviewerNote,
        reviewed_at: now,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
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
