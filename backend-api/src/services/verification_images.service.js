const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const privateDirectory = path.resolve(__dirname, "../../private_uploads/kyc");
const imageTypes = {
  "image/jpeg": {
    mimeType: "image/jpeg",
    extension: "jpg",
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  "image/png": {
    mimeType: "image/png",
    extension: "png",
    matches: (buffer) =>
      buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
  },
  "image/webp": {
    mimeType: "image/webp",
    extension: "webp",
    matches: (buffer) =>
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP",
  },
};

async function storeImage(dataUri) {
  const match =
    typeof dataUri === "string" &&
    dataUri.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) {
    const error = new Error("Ảnh xác minh không hợp lệ.");
    error.status = 400;
    throw error;
  }

  const [, mimeType, encodedImage] = match;
  const imageType = imageTypes[mimeType];
  const image = Buffer.from(encodedImage, "base64");
  if (
    image.length === 0 ||
    image.length > 5 * 1024 * 1024 ||
    !imageType.matches(image)
  ) {
    const error = new Error("Ảnh xác minh không hợp lệ hoặc vượt quá 5 MB.");
    error.status = 400;
    throw error;
  }

  await fs.mkdir(privateDirectory, { recursive: true });
  const filename = `${randomUUID()}.${imageType.extension}`;
  await fs.writeFile(path.join(privateDirectory, filename), image, {
    flag: "wx",
  });
  return { filename, mimeType };
}

async function readImage(filename) {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(filename || "")) return null;
  const imageType = Object.values(imageTypes).find(
    (type) => filename.endsWith(`.${type.extension}`),
  );
  if (!imageType) return null;

  try {
    const image = await fs.readFile(path.join(privateDirectory, filename));
    return { image, mimeType: imageType.mimeType };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function removeImage(filename) {
  await fs.rm(path.join(privateDirectory, filename), { force: true });
}

module.exports = { storeImage, readImage, removeImage };
