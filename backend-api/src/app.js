require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const path = require("node:path");

const http = require("http");
const { Server } = require("socket.io");

const db = require("./common/db"); // MySQL TiDB
const mongoDb = require("./common/mongo"); // MongoDB Chat

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Kết nối MongoDB
mongoDb();

// Khởi tạo Socket.IO
require("./sockets/chat.socket")(io);

app.use(morgan("dev"));
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads"), {
  dotfiles: "deny",
  immutable: true,
  maxAge: "1y",
}));

app.get("/api/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check database query failed:", error.message);
    res.status(503).json({ status: "database_unavailable", database: "disconnected" });
  }
});

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
const chatRoute = require("./routes/chat.route");
const administrativeAreasRouter = require("./routes/administrative_areas.route");
const notificationsRouter = require("./routes/notifications.route");
const adminRouter = require("./routes/admin.route");
const authRouter = require("./routes/auth.route");
const uploadsRouter = require("./routes/uploads.route");

app.use("/api/uploads", uploadsRouter);
app.use("/api/auth", authRouter);
app.use("/api/rental-requests", rentalRequestsRoute);
app.use("/api/transactions", transactionsRoute);
app.use("/api/subscriptions", subscriptionsRoute);
app.use("/api/admin", adminRouter);
app.use("/api/chat", chatRoute);
app.use("/api/administrative-areas", administrativeAreasRouter);
app.use("/api/notifications", notificationsRouter);

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
  const status = Number(err.statusCode ?? err.status);
  const statusCode = Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;
  const message = process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message;
  res.status(statusCode).json({ success: false, message });
});

// Chạy Server & Test kết nối DB
const PORT = process.env.PORT || 4000;

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Test thử truy vấn kết nối TiDB Cloud
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    console.log("✅ Đã kết nối thành công tới Database (TiDB Cloud)!");
  } catch (error) {
    console.error("❌ Kết nối Database thất bại:", error.message);
  }
});
