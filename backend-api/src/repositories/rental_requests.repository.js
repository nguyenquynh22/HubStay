const db = require("../common/db");

class RentalRequestsRepository {
  static async getAll() {
    const sql = `
      SELECT r.*, p.title AS post_title, p.author_id, p.status AS post_status, u.full_name AS tenant_name, u.phone AS tenant_phone
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
      SELECT r.*, p.title AS post_title, p.author_id, p.status AS post_status, u.full_name AS tenant_name, u.phone AS tenant_phone
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

  static async getForUser(userId) {
    const [rows] = await db.query(
      `SELECT r.*, p.title AS post_title, p.author_id, p.status AS post_status, p.price,
              u.full_name AS tenant_name, u.phone AS tenant_phone,
              CASE WHEN p.author_id = ? THEN 1 ELSE 0 END AS is_landlord
       FROM rental_requests r
       JOIN posts p ON p.post_id = r.post_id
       LEFT JOIN users u ON u.user_id = r.tenant_id
       WHERE p.author_id = ? OR r.tenant_id = ?
       ORDER BY r.created_at DESC`,
      [userId, userId, userId],
    );
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
    return {
      request_id: result.insertId,
      post_id: Number(data.post_id),
      tenant_id: Number(data.tenant_id),
      status: data.status || "PENDING",
      note: data.note || null,
    };
  }

  static async createIfAvailable(data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [posts] = await connection.query(
        "SELECT post_id, author_id, status FROM posts WHERE post_id = ? FOR UPDATE",
        [data.post_id],
      );
      const post = posts[0];
      if (!post) {
        await connection.rollback();
        return { error: "POST_NOT_FOUND" };
      }
      if (Number(post.author_id) === Number(data.tenant_id)) {
        await connection.rollback();
        return { error: "OWN_POST" };
      }
      if (post.status !== "AVAILABLE") {
        await connection.rollback();
        return { error: "POST_UNAVAILABLE" };
      }
      const [pending] = await connection.query(
        "SELECT request_id FROM rental_requests WHERE post_id = ? AND tenant_id = ? AND status = 'PENDING' LIMIT 1",
        [data.post_id, data.tenant_id],
      );
      if (pending.length) {
        await connection.rollback();
        return { error: "REQUEST_EXISTS" };
      }
      const [result] = await connection.query(
        "INSERT INTO rental_requests (post_id, tenant_id, status, note) VALUES (?, ?, 'PENDING', ?)",
        [data.post_id, data.tenant_id, data.note || null],
      );
      await connection.commit();
      return {
        request_id: result.insertId,
        post_id: Number(data.post_id),
        tenant_id: Number(data.tenant_id),
        author_id: Number(post.author_id),
        status: "PENDING",
        note: data.note || null,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async transitionStatus(id, actorId, status) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT r.*, p.author_id, p.status AS post_status
         FROM rental_requests r JOIN posts p ON p.post_id = r.post_id
         WHERE r.request_id = ? FOR UPDATE`,
        [id],
      );
      const request = rows[0];
      if (!request) {
        await connection.rollback();
        return { error: "REQUEST_NOT_FOUND" };
      }
      const isLandlord = Number(request.author_id) === Number(actorId);
      const isTenant = Number(request.tenant_id) === Number(actorId);
      if ((status === "ACCEPTED" || status === "REJECTED") && !isLandlord) {
        await connection.rollback();
        return { error: "FORBIDDEN" };
      }
      if (status === "CANCELLED" && !isTenant) {
        await connection.rollback();
        return { error: "FORBIDDEN" };
      }
      if (request.status !== "PENDING") {
        await connection.rollback();
        return { error: "REQUEST_NOT_PENDING" };
      }
      if (status === "ACCEPTED") {
        if (request.post_status !== "AVAILABLE") {
          await connection.rollback();
          return { error: "POST_UNAVAILABLE" };
        }
        const [otherRequests] = await connection.query(
          "SELECT tenant_id FROM rental_requests WHERE post_id = ? AND request_id <> ? AND status = 'PENDING'",
          [request.post_id, id],
        );
        const [postUpdate] = await connection.query(
          "UPDATE posts SET status = 'RENTED' WHERE post_id = ? AND status = 'AVAILABLE'",
          [request.post_id],
        );
        if (!postUpdate.affectedRows) {
          await connection.rollback();
          return { error: "POST_UNAVAILABLE" };
        }
        await connection.query(
          "UPDATE rental_requests SET status = 'REJECTED' WHERE post_id = ? AND request_id <> ? AND status = 'PENDING'",
          [request.post_id, id],
        );
        request.rejected_tenant_ids = otherRequests.map((item) =>
          Number(item.tenant_id),
        );
      }
      const [result] = await connection.query(
        "UPDATE rental_requests SET status = ? WHERE request_id = ? AND status = 'PENDING'",
        [status, id],
      );
      if (!result.affectedRows) {
        await connection.rollback();
        return { error: "REQUEST_NOT_PENDING" };
      }
      await connection.commit();
      return {
        request_id: Number(id),
        post_id: Number(request.post_id),
        tenant_id: Number(request.tenant_id),
        rejected_tenant_ids: request.rejected_tenant_ids || [],
        status,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async markPostRented(postId, actorId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        "SELECT author_id, status FROM posts WHERE post_id = ? FOR UPDATE",
        [postId],
      );
      const post = rows[0];
      if (!post) {
        await connection.rollback();
        return { error: "POST_NOT_FOUND" };
      }
      if (Number(post.author_id) !== Number(actorId)) {
        await connection.rollback();
        return { error: "FORBIDDEN" };
      }
      if (post.status !== "AVAILABLE") {
        await connection.rollback();
        return { error: "POST_UNAVAILABLE" };
      }
      const [pendingRequests] = await connection.query(
        "SELECT tenant_id FROM rental_requests WHERE post_id = ? AND status = 'PENDING'",
        [postId],
      );
      const [postUpdate] = await connection.query(
        "UPDATE posts SET status = 'RENTED' WHERE post_id = ?",
        [postId],
      );
      if (!postUpdate.affectedRows) {
        await connection.rollback();
        return { error: "POST_UNAVAILABLE" };
      }
      await connection.query(
        "UPDATE rental_requests SET status = 'REJECTED' WHERE post_id = ? AND status = 'PENDING'",
        [postId],
      );
      await connection.commit();
      return {
        post_id: Number(postId),
        rejected_tenant_ids: pendingRequests.map((item) =>
          Number(item.tenant_id),
        ),
        status: "RENTED",
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
      "DELETE FROM rental_requests WHERE request_id = ?",
      [id],
    );
    return result.affectedRows > 0;
  }
}

module.exports = RentalRequestsRepository;
