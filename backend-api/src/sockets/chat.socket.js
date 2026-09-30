const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");

module.exports = (io) => {
  io.on("connection", (socket) => {
    socket.on("join_conversation", async ({ conversation_id, user_id } = {}, done = () => {}) => {
      try {
        const c = await Conversation.findById(conversation_id);
        if (!c || ![c.tenant_id, c.landlord_id].includes(Number(user_id))) return done({ success: false, message: "Bạn không thuộc cuộc trò chuyện này" });
        socket.data.userId = Number(user_id);
        socket.join(String(conversation_id));
        done({ success: true });
      } catch { done({ success: false, message: "Không thể tham gia cuộc trò chuyện" }); }
    });

    socket.on("send_message", async ({ conversation_id, text } = {}, done = () => {}) => {
      try {
        const content = typeof text === "string" ? text.trim() : "";
        if (!content || content.length > 4000 || !socket.data.userId) return done({ success: false, message: "Tin nhắn không hợp lệ hoặc chưa tham gia cuộc trò chuyện" });
        const c = await Conversation.findById(conversation_id);
        if (!c || ![c.tenant_id, c.landlord_id].includes(socket.data.userId)) return done({ success: false, message: "Bạn không thuộc cuộc trò chuyện này" });
        if (c.is_closed) return done({ success: false, message: "Cuộc trò chuyện đã đóng" });
        const message = await Message.create({ conversation_id, sender_id: socket.data.userId, text: content });
        c.last_message = content;
        c.last_message_at = new Date();
        await c.save();
        io.to(String(conversation_id)).emit("receive_message", message);
        done({ success: true });
      } catch (err) { console.error("Chat send failed:", err.message); done({ success: false, message: "Không gửi được tin nhắn" }); }
    });
  });
};
