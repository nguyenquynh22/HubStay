const axios = require("axios");
const express = require("express");

const router = express.Router();
const cache = new Map();
const cacheDurationMs = 24 * 60 * 60 * 1000;
const apiBase = "https://provinces.open-api.vn/api/v1";

const getCached = async (key, url) => {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const response = await axios.get(url, { timeout: 10000 });
  cache.set(key, {
    data: response.data,
    expiresAt: Date.now() + cacheDurationMs,
  });
  return response.data;
};

const sendData = (load) => async (req, res) => {
  try {
    const data = await load(req);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Administrative area API failed:", error.message);
    res.status(502).json({
      success: false,
      message: "Không tải được danh sách địa giới. Vui lòng thử lại.",
    });
  }
};

router.get(
  "/provinces",
  sendData(() => getCached("provinces", `${apiBase}/p/`)),
);
router.get(
  "/provinces/:provinceCode/districts",
  sendData((req) => {
    const code = Number(req.params.provinceCode);
    if (!Number.isInteger(code) || code <= 0)
      throw new Error("Invalid province code");
    return getCached(`province:${code}`, `${apiBase}/p/${code}?depth=2`);
  }),
);
router.get(
  "/districts/:districtCode/wards",
  sendData((req) => {
    const code = Number(req.params.districtCode);
    if (!Number.isInteger(code) || code <= 0)
      throw new Error("Invalid district code");
    return getCached(`district:${code}`, `${apiBase}/d/${code}?depth=2`);
  }),
);

module.exports = router;
