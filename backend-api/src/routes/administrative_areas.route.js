const axios = require("axios");
const express = require("express");

const router = express.Router();
const cache = new Map();
const cacheDurationMs = 24 * 60 * 60 * 1000;
const staleCacheDurationMs = 7 * 24 * 60 * 60 * 1000;
const apiBase = "https://provinces.open-api.vn/api/v1";

const getCached = async (key, url) => {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const response = await axios.get(url, { timeout: 15000 });
    cache.set(key, {
      data: response.data,
      expiresAt: Date.now() + cacheDurationMs,
      staleUntil: Date.now() + staleCacheDurationMs,
    });
    return response.data;
  } catch (error) {
    if (cached && cached.staleUntil > Date.now()) {
      console.warn(`Administrative area API unavailable; serving stale ${key} cache.`);
      return cached.data;
    }
    throw error;
  }
};

const sendData = (load) => async (req, res) => {
  try {
    const data = await load(req);
    res.json({ success: true, data });
  } catch (error) {
    console.error(
      "Administrative area API failed:",
      error.code || error.response?.status || "unknown",
      error.message,
    );
    res.status(502).json({
      success: false,
      message:
        "Máy chủ không tải được danh sách địa giới từ nguồn dữ liệu. Vui lòng thử lại sau.",
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
