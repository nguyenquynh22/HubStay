const Repo = require('../repositories/landmarks.repository');

module.exports = {
  getAll: async (req, res, next) => {
    try {
      const data = await Repo.getAll();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  getById: async (req, res, next) => {
    try {
      const item = await Repo.getById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: item });
    } catch (err) { next(err); }
  },

  create: async (req, res, next) => {
    try {
      const { name, latitude, longitude } = req.body || {};
      const lat = Number(latitude);
      const lng = Number(longitude);
      const categories = ['UNIVERSITY', 'PARK', 'MUSEUM', 'HOSPITAL', 'SHOPPING', 'OTHER'];
      if (!String(name || '').trim() || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên và tọa độ hợp lệ cho địa điểm.' });
      }
      if (req.body.category && !categories.includes(req.body.category)) {
        return res.status(400).json({ success: false, message: 'Danh mục địa điểm không hợp lệ.' });
      }
      const newItem = await Repo.create(req.body);
      res.status(201).json({ success: true, message: 'Created successfully', data: newItem });
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const updated = await Repo.update(req.params.id, req.body);
      res.json({ success: true, message: 'Updated successfully', data: updated });
    } catch (err) { next(err); }
  },

  delete: async (req, res, next) => {
    try {
      const success = await Repo.delete(req.params.id);
      if (!success) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) { next(err); }
  }
};
