require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const http = require('http');
const { Server } = require('socket.io');

const db = require("./common/db"); // MySQL TiDB
const mongoDb = require("./common/mongo"); // MongoDB Chat

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Kết nối MongoDB
mongoDb();

// Khởi tạo Socket.IO
require('./sockets/chat.socket')(io);

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import các Routes
const appointmentsRouter = require("./routes/appointments.route");
const landlord_availabilityRouter = require("./routes/landlord_availability.route");
const landmarksRouter = require("./routes/landmarks.route");
const post_imagesRouter = require("./routes/post_images.route");
const post_reactionsRouter = require("./routes/post_reactions.route");
const post_reportsRouter = require("./routes/post_reports.route");
const postsRouter = require("./routes/posts.route");
const saved_postsRouter = require("./routes/saved_posts.route");
const usersRouter = require("./routes/users.route");
const verification_requestsRouter = require("./routes/verification_requests.route");

const rentalRequestsRoute = require("./routes/rental_requests.route");
const transactionsRoute = require("./routes/transactions.route");
const subscriptionsRoute = require("./routes/subscriptions.route");

app.use("/api/rental-requests", rentalRequestsRoute);
app.use("/api/transactions", transactionsRoute);
app.use("/api/subscriptions", subscriptionsRoute);

// Map Endpoint APIs
app.use("/api/appointments", appointmentsRouter);
app.use("/api/landlord_availability", landlord_availabilityRouter);
app.use("/api/landmarks", landmarksRouter);
app.use("/api/post_images", post_imagesRouter);
app.use("/api/post_reactions", post_reactionsRouter);
app.use("/api/post_reports", post_reportsRouter);
app.use("/api/posts", postsRouter);
app.use("/api/saved_posts", saved_postsRouter);
app.use("/api/users", usersRouter);
app.use("/api/verification_requests", verification_requestsRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// Chạy Server & Test kết nối DB
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Test thử truy vấn kết nối TiDB Cloud
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    console.log("✅ Đã kết nối thành công tới Database (TiDB Cloud)!");
  } catch (error) {
    console.error("❌ Kết nối Database thất bại:", error.message);
  }
});
