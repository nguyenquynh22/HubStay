const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    post_id: { type: Number, required: true, index: true }, // ID Bài đăng từ MySQL
    landlord_id: { type: Number, required: true, index: true }, // ID Chủ trọ từ MySQL
    tenant_id: { type: Number, required: true, index: true }, // ID Người tìm trọ từ MySQL
    last_message: { type: String, default: "" }, // Tin nhắn cuối cùng
    last_message_at: { type: Date, default: Date.now },
    is_closed: { type: Boolean, default: false }, // true nếu phòng đã được cho thuê
    close_reason: { type: String, default: "" }, // Lý do đóng (VD: "Bài đăng đã cho thuê")
  },
  { timestamps: true }
);

// Tránh tạo duplicate cuộc hội thoại cho cùng 1 bài đăng + người thuê
conversationSchema.index({ post_id: 1, tenant_id: 1 }, { unique: true });

module.exports = mongoose.model("Conversation", conversationSchema);