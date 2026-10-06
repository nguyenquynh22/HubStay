const db = require("../common/db");

class VipPackagesRepository {
  static async findActive() {
    const [rows] = await db.query(
      "SELECT * FROM vip_packages WHERE is_active = 1 ORDER BY sort_order ASC, price ASC",
    );
    return rows.map((row) => ({
      ...row,
      price: Number(row.price),
      duration_days: Number(row.duration_days),
      sort_order: Number(row.sort_order),
      benefits:
        typeof row.benefits === "string"
          ? JSON.parse(row.benefits)
          : row.benefits || [],
    }));
  }

  static async findAll() {
    const [rows] = await db.query(
      "SELECT * FROM vip_packages ORDER BY is_active DESC, sort_order ASC, price ASC",
    );
    return rows.map((row) => ({
      ...row,
      price: Number(row.price),
      duration_days: Number(row.duration_days),
      sort_order: Number(row.sort_order),
      benefits:
        typeof row.benefits === "string"
          ? JSON.parse(row.benefits)
          : row.benefits || [],
    }));
  }

  static async findByName(packageName) {
    const [rows] = await db.query(
      "SELECT * FROM vip_packages WHERE package_name = ? LIMIT 1",
      [packageName],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      ...row,
      price: Number(row.price),
      duration_days: Number(row.duration_days),
      sort_order: Number(row.sort_order),
      benefits:
        typeof row.benefits === "string"
          ? JSON.parse(row.benefits)
          : row.benefits || [],
    };
  }

  static async create(data) {
    const sql = `
      INSERT INTO vip_packages (
        package_name, display_name, price, duration_days, benefits, description, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(sql, [
      data.package_name,
      data.display_name,
      Number(data.price),
      Number(data.duration_days),
      JSON.stringify(data.benefits || []),
      data.description || null,
      data.is_active ?? 1,
      Number(data.sort_order ?? 0),
    ]);
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await db.query(
      "SELECT * FROM vip_packages WHERE package_id = ? LIMIT 1",
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      ...row,
      price: Number(row.price),
      duration_days: Number(row.duration_days),
      sort_order: Number(row.sort_order),
      benefits:
        typeof row.benefits === "string"
          ? JSON.parse(row.benefits)
          : row.benefits || [],
    };
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    const assign = {
      package_name: "package_name",
      display_name: "display_name",
      price: "price",
      duration_days: "duration_days",
      benefits: "benefits",
      description: "description",
      is_active: "is_active",
      sort_order: "sort_order",
    };
    Object.entries(data).forEach(([key, value]) => {
      if (assign[key] === undefined || value === undefined) return;
      fields.push(`${assign[key]} = ?`);
      values.push(key === "benefits" ? JSON.stringify(value || []) : value);
    });
    if (!fields.length) return this.findById(id);
    values.push(id);
    await db.query(
      `UPDATE vip_packages SET ${fields.join(", ")} WHERE package_id = ?`,
      values,
    );
    return this.findById(id);
  }

  static async delete(id) {
    const [result] = await db.query(
      "DELETE FROM vip_packages WHERE package_id = ?",
      [id],
    );
    return result.affectedRows > 0;
  }
}

module.exports = VipPackagesRepository;
