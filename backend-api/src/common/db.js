require('dotenv').config(); 
const mysql = require('mysql2');

// Tạo pool kết nối lấy thông tin từ file .env
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 4000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false // Bắt buộc cho TiDB Cloud
  }
});

// Kiểm tra kết nối thử khi khởi động
pool.getConnection((err, connection) => {
  if (err) {
    console.error('![LỖI] Kết nối CSDL TiDB thất bại:', err.message);
  } else {
    console.log('[OK] Đã kết nối thành công tới TiDB Cloud!');
    connection.release();
  }
});

module.exports = pool.promise();