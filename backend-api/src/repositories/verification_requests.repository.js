const db = require("../common/db");
const { getKycSubmissionBlock } = require("../lib/kyc-submission-policy");

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

  static async createIfAllowed(data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.query(
        "SELECT user_id, is_verified FROM users WHERE user_id = ? FOR UPDATE",
        [data.user_id],
      );
      if (!users[0]) {
        await connection.rollback();
        return { error: "USER_NOT_FOUND" };
      }
      const [requests] = await connection.query(
        "SELECT status FROM verification_requests WHERE user_id = ? ORDER BY created_at DESC, request_id DESC LIMIT 1 FOR UPDATE",
        [data.user_id],
      );
      const block = getKycSubmissionBlock(
        users[0].is_verified,
        requests[0]?.status,
      );
      if (block) {
        await connection.rollback();
        return { error: block };
      }

      const payload = {
        ...data,
        status: "PENDING",
        created_at: new Date(),
      };
      const [result] = await connection.query(
        "INSERT INTO verification_requests SET ?",
        [payload],
      );
      await connection.query(
        "UPDATE users SET kyc_status = 'PENDING' WHERE user_id = ?",
        [data.user_id],
      );
      await connection.commit();
      return {
        data: { request_id: result.insertId, ...payload },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
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
      const [owners] = await connection.query(
        "SELECT user_id FROM verification_requests WHERE request_id = ?",
        [id],
      );
      if (!owners[0]) {
        await connection.rollback();
        return { error: "REQUEST_NOT_FOUND" };
      }
      await connection.query(
        "SELECT user_id FROM users WHERE user_id = ? FOR UPDATE",
        [owners[0].user_id],
      );
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
