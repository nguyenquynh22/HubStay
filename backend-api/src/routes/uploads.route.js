const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();
const avatarDirectory = path.resolve(__dirname, "../../uploads/avatars");
const reportEvidenceDirectory = path.resolve(__dirname, "../../uploads/report-evidence");
const allowedTypes = new Map([
  ["image/jpeg", { extension: "jpg", signature: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff }],
  ["image/png", { extension: "png", signature: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ["image/webp", { extension: "webp", signature: (buffer) => buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" }],
]);

const dataUriPattern = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/;

function parseImageDataUri(value) {
  if (typeof value !== "string") return null;
  const match = value.match(dataUriPattern);
  if (!match) return null;
  const imageType = allowedTypes.get(match[1]);
  if (!imageType) return null;
  const image = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!image.length || image.length > 5 * 1024 * 1024 || !imageType.signature(image)) return null;
  return { imageType, image };
}

router.post("/avatar", requireAdmin, express.raw({ type: [...allowedTypes.keys()], limit: "5mb" }), async (req, res, next) => {
  try {
    const imageType = allowedTypes.get(req.headers["content-type"]);
    const image = req.body;
    if (!imageType || !Buffer.isBuffer(image) || image.length === 0 || !imageType.signature(image)) {
      return res.status(400).json({ success: false, message: "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ." });
    }

    await fs.mkdir(avatarDirectory, { recursive: true });
    const filename = `${randomUUID()}.${imageType.extension}`;
    await fs.writeFile(path.join(avatarDirectory, filename), image, { flag: "wx" });
    const origin = `${req.protocol}://${req.get("host")}`;
    return res.status(201).json({ success: true, url: `${origin}/uploads/avatars/${filename}` });
  } catch (error) {
    return next(error);
  }
});

router.post("/report-evidence", async (req, res, next) => {
  try {
    const parsed = parseImageDataUri(req.body?.image);
    if (!parsed) {
      return res.status(400).json({ success: false, message: "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ, tối đa 5 MB." });
    }

    await fs.mkdir(reportEvidenceDirectory, { recursive: true });
    const filename = `${randomUUID()}.${parsed.imageType.extension}`;
    await fs.writeFile(path.join(reportEvidenceDirectory, filename), parsed.image, { flag: "wx" });
    const origin = `${req.protocol}://${req.get("host")}`;
    return res.status(201).json({ success: true, url: `${origin}/uploads/report-evidence/${filename}` });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
