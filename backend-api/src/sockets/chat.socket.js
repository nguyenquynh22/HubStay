const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Người dùng kết nối Socket: ${socket.id}`);

    // 1. Tham gia vào phòng chat cụ thể
    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId);
    });

    // 2. Gửi tin nhắn
    socket.on("send_message", async (data) => {
      try {
        const { conversation_id, sender_id, text } = data;

        // Kiểm tra xem đoạn chat có bị khóa không (Khi trọ đã thuê)
        const conversation = await Conversation.findById(conversation_id);
        if (!conversation) return;
        if (conversation.is_closed) {
          return socket.emit("error_message", "Cuộc trò chuyện này đã bị khóa do phòng đã cho thuê.");
        }

        // Lưu tin nhắn mới vào MongoDB
        const newMessage = await Message.create({
          conversation_id,
          sender_id,
          text,
        });

        // Cập nhật tin nhắn cuối cùng trong Conversation
        await Conversation.findByIdAndUpdate(conversation_id, {
          last_message: text,
          last_message_at: new Date(),
        });

        // Bắn tin nhắn mới tới tất cả người trong room
        io.to(conversation_id).emit("receive_message", newMessage);
      } catch (err) {
        console.error("Lỗi gửi tin nhắn:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ Người dùng ngắt kết nối Socket: ${socket.id}`);
    });
  });
};