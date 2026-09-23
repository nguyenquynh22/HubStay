const Repo = require("../repositories/users.repository");
const bcrypt = require("bcryptjs");

module.exports = {
  getAll: async (req, res, next) => {
    try {
      const data = await Repo.getAll();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req, res, next) => {
    try {
      const item = await Repo.getById(req.params.id);
      if (!item)
        return res.status(404).json({ success: false, message: "Not found" });

      // Loại bỏ password_hash trước khi trả dữ liệu về client
      if (item.password_hash) {
        delete item.password_hash;
      }

      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      // 1. Tách 'password' ra khỏi req.body để tránh bị chèn trực tiếp tên cột 'password' vào SQL
      const { password, ...otherFields } = req.body;
      const userData = { ...otherFields };

      // 2. Hash mật khẩu và gán vào đúng tên cột trong DB là 'password_hash'
      if (password) {
        const salt = await bcrypt.genSalt(10);
        userData.password_hash = await bcrypt.hash(password, salt);
      }

      // 3. Gọi repository thêm vào CSDL
      const newItem = await Repo.create(userData);

      // 4. Xóa chuỗi hash mật khẩu trước khi gửi về client
      if (newItem && newItem.password_hash) {
        delete newItem.password_hash;
      }

      res
        .status(201)
        .json({
          success: true,
          message: "Created successfully",
          data: newItem,
        });
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const { password, ...otherFields } = req.body;
      const userData = { ...otherFields };

      // Hash mật khẩu và gán vào đúng tên cột 'password_hash' của CSDL
      if (password) {
        const salt = await bcrypt.genSalt(10);
        userData.password_hash = await bcrypt.hash(password, salt);
      }
      const updated = await Repo.update(req.params.id, userData);
      if (updated && updated.password_hash) {
        delete updated.password_hash;
      }
      res.json({
        success: true,
        message: "Updated successfully",
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const success = await Repo.delete(req.params.id);
      if (!success)
        return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
      next(err);
    }
  },
};
