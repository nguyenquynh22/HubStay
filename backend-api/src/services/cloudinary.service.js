const cloudinary = require("cloudinary").v2;

const configured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Thiếu cấu hình Cloudinary: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  return cloudinary;
};

const uploadBase64Image = async (dataUri, folder) => {
  const match = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUri,
  );
  if (!match) {
    throw new Error("Định dạng ảnh không hợp lệ");
  }

  const bytes = Buffer.from(match[3], "base64");
  if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
    throw new Error("Kích thước ảnh phải từ 1 byte đến 8 MB");
  }

  const { secure_url } = await configured().uploader.upload(
    `data:${match[1]};base64,${match[3]}`,
    {
      folder,
      resource_type: "image",
    },
  );

  return secure_url;
};

module.exports = { uploadBase64Image };
