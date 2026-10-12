const cloudinary = require("./cloudinary.service");

const imageTypes = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

async function storeImage(dataUri) {
  const match =
    typeof dataUri === "string" &&
    dataUri.match(
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/,
    );
  if (!match) {
    const error = new Error("Ảnh xác minh không hợp lệ.");
    error.status = 400;
    throw error;
  }

  const [, mimeType, encodedImage] = match;
  const image = Buffer.from(encodedImage, "base64");
  if (image.length === 0 || image.length > 5 * 1024 * 1024) {
    const error = new Error("Ảnh xác minh không hợp lệ hoặc vượt quá 5 MB.");
    error.status = 400;
    throw error;
  }
  if (!imageTypes[mimeType]) {
    const error = new Error("Ảnh xác minh phải là JPEG, PNG hoặc WebP.");
    error.status = 400;
    throw error;
  }

  return cloudinary.uploadBase64Image(dataUri, "kyc");
}

module.exports = {
  storeImage,
  readImage: async () => null,
  removeImage: cloudinary.deleteImageByUrl,
};
