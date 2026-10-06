const VipPackagesRepository = require("../repositories/vip_packages.repository");

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const normalizeBenefits = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 10);
};

const validatePackage = (payload) => {
  const packageName = String(payload?.package_name ?? "").trim();
  const displayName = String(payload?.display_name ?? "").trim();
  const price = Number(payload?.price);
  const durationDays = Number(payload?.duration_days);
  const benefits = normalizeBenefits(payload?.benefits);

  if (!packageName || !displayName || !Number.isFinite(price) || price <= 0) {
    return "Tên gói, giá và thời hạn phải hợp lệ.";
  }
  if (
    !Number.isInteger(durationDays) ||
    durationDays < 1 ||
    durationDays > 3650
  ) {
    return "Thời hạn phải là số ngày hợp lệ, tối đa 3650 ngày.";
  }
  if (benefits.length === 0) {
    return "Gói VIP cần ít nhất một lợi ích.";
  }
  return null;
};

module.exports = {
  getActive: async (_req, res, next) => {
    try {
      const data = await VipPackagesRepository.findActive();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  getAll: async (_req, res, next) => {
    try {
      const data = await VipPackagesRepository.findAll();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const error = validatePackage(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error });
      }
      const packageName = String(req.body.package_name).trim();
      const existing = await VipPackagesRepository.findByName(packageName);
      if (existing) {
        return res
          .status(409)
          .json({ success: false, message: "Tên gói VIP đã tồn tại." });
      }
      const item = await VipPackagesRepository.create({
        ...req.body,
        benefits: normalizeBenefits(req.body.benefits),
      });
      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id)
        return res
          .status(400)
          .json({ success: false, message: "Mã gói không hợp lệ." });
      const existing = await VipPackagesRepository.findById(id);
      if (!existing)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy gói VIP." });
      if (
        req.body.package_name &&
        String(req.body.package_name).trim() !== existing.package_name
      ) {
        const duplicate = await VipPackagesRepository.findByName(
          String(req.body.package_name).trim(),
        );
        if (duplicate) {
          return res
            .status(409)
            .json({ success: false, message: "Tên gói VIP đã tồn tại." });
        }
      }
      const payload = { ...req.body };
      if (payload.benefits)
        payload.benefits = normalizeBenefits(payload.benefits);
      const result = await VipPackagesRepository.update(id, payload);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  remove: async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id)
        return res
          .status(400)
          .json({ success: false, message: "Mã gói không hợp lệ." });
      const deleted = await VipPackagesRepository.delete(id);
      if (!deleted)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy gói VIP." });
      return res.json({ success: true, message: "Xóa gói VIP thành công." });
    } catch (error) {
      next(error);
    }
  },
};
