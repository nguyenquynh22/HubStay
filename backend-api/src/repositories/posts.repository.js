const db = require("../common/db");

class postsRepository {
  static calculateDistanceKm(fromLat, fromLng, toLat, toLng) {
    const earthRadiusKm = 6371;
    const latDelta = ((toLat - fromLat) * Math.PI) / 180;
    const lngDelta = ((toLng - fromLng) * Math.PI) / 180;
    const a =
      Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
      Math.cos((fromLat * Math.PI) / 180) *
        Math.cos((toLat * Math.PI) / 180) *
        Math.sin(lngDelta / 2) *
        Math.sin(lngDelta / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((earthRadiusKm * c).toFixed(1));
  }

  static async getAll() {
    const [rows] = await db.query("SELECT * FROM posts ORDER BY post_id DESC");
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query("SELECT * FROM posts WHERE post_id = ?", [
      id,
    ]);
    return rows[0] || null;
  }

  static async getByAuthorId(authorId) {
    const [rows] = await db.query(
      "SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC",
      [authorId],
    );
    return rows;
  }

  static async create(data) {
    const sql = `
      INSERT INTO posts (
        user_id, title, description, price, address, latitude, longitude,
        status, type, is_verified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      data.user_id,
      data.title,
      data.description || null,
      data.price || null,
      data.address || null,
      data.latitude ?? null,
      data.longitude ?? null,
      data.status || "AVAILABLE",
      data.type || "CHO_THUE",
      data.is_verified ?? 0,
    ];

    const [result] = await db.query(sql, values);
    return { post_id: result.insertId, ...data };
  }

  static async update(id, updateData) {
    const allowedFields = [
      "user_id",
      "title",
      "description",
      "price",
      "address",
      "latitude",
      "longitude",
      "status",
      "type",
      "is_verified",
    ];

    const fieldsToUpdate = [];
    const values = [];

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        fieldsToUpdate.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fieldsToUpdate.length === 0) return true;

    values.push(id);
    const sql = `UPDATE posts SET ${fieldsToUpdate.join(", ")} WHERE post_id = ?`;
    const [result] = await db.query(sql, values);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.query("DELETE FROM posts WHERE post_id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  }

  static async getNearbyByLandmark(landmarkId, radiusKm = 10) {
    if (!landmarkId) return [];

    const [landmarkRows] = await db.query(
      "SELECT latitude, longitude FROM landmarks WHERE landmark_id = ?",
      [landmarkId],
    );

    const landmark = landmarkRows[0];
    if (!landmark) return [];

    const [rows] = await db.query(
      "SELECT * FROM posts WHERE latitude IS NOT NULL AND longitude IS NOT NULL",
    );

    return rows
      .map((post) => ({
        ...post,
        distance_km: this.calculateDistanceKm(
          Number(landmark.latitude),
          Number(landmark.longitude),
          Number(post.latitude),
          Number(post.longitude),
        ),
      }))
      .filter((post) => post.distance_km <= Number(radiusKm))
      .sort((a, b) => a.distance_km - b.distance_km);
  }

  static async getDistanceToPost({ postId, landmarkId }) {
    const post = await this.getById(postId);
    if (!post) return null;

    const [landmarkRows] = await db.query(
      "SELECT latitude, longitude FROM landmarks WHERE landmark_id = ?",
      [landmarkId],
    );

    const landmark = landmarkRows[0];
    if (!landmark) return null;

    const distanceKm = this.calculateDistanceKm(
      Number(landmark.latitude),
      Number(landmark.longitude),
      Number(post.latitude),
      Number(post.longitude),
    );

    return {
      post_id: post.post_id,
      landmark_id: landmarkId,
      distance_km: distanceKm,
      distance_label: `${distanceKm.toFixed(1)} km`,
      post,
    };
  }
}

module.exports = postsRepository;
