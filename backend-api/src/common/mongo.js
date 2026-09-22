require('dotenv').config();
const mongoose = require('mongoose');

const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[OK] Đã kết nối MongoDB Atlas (Chat) thành công!');
  } catch (error) {
    console.error('![LỖI] Kết nối MongoDB thất bại:', error.message);
  }
};

module.exports = connectMongoDB;