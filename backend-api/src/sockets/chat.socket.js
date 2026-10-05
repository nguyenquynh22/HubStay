const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const Posts = require("../repositories/posts.repository");
const Notifications = require("../services/notifications.service");

module.exports = (io) => {
  io.on("connection", (socket) => {
    socket.on(
      "join_conversation",
      async ({ conversation_id, user_id } = {}, done = () => {}) => {
        try {
          const c = await Conversation.findById(conversation_id);
          if (!c || ![c.tenant_id, c.landlord_id].includes(Number(user_id)))
            return done({
              success: false,
              message: "Bạn không thuộc cuộc trò chuyện này",
            });
          const post = await Posts.getById(c.post_id);
          if (!post || post.status !== "AVAILABLE") {
            c.is_closed = true;
            c.close_reason = "Bài đăng đã cho thuê hoặc đóng";
            await c.save();
            return done({
              success: false,
              message:
                "Bài đăng đã đóng, cuộc trò chuyện chỉ còn ở chế độ lưu trữ",
            });
          }
          if (c.is_closed)
            return done({ success: false, message: "Cuộc trò chuyện đã đóng" });
          socket.data.userId = Number(user_id);
          socket.join(String(conversation_id));
          done({ success: true });
        } catch {
          done({
            success: false,
            message: "Không thể tham gia cuộc trò chuyện",
          });
        }
      },
    );

    socket.on(
      "send_message",
      async ({ conversation_id, text } = {}, done = () => {}) => {
        try {
          const content = typeof text === "string" ? text.trim() : "";
          if (!content || content.length > 4000 || !socket.data.userId)
            return done({
              success: false,
              message:
                "Tin nhắn không hợp lệ hoặc chưa tham gia cuộc trò chuyện",
            });
          const c = await Conversation.findById(conversation_id);
          if (!c || ![c.tenant_id, c.landlord_id].includes(socket.data.userId))
            return done({
              success: false,
              message: "Bạn không thuộc cuộc trò chuyện này",
            });
          if (c.is_closed)
            return done({ success: false, message: "Cuộc trò chuyện đã đóng" });
          const post = await Posts.getById(c.post_id);
          if (!post || post.status !== "AVAILABLE") {
            c.is_closed = true;
            c.close_reason = "Bài đăng đã cho thuê hoặc đóng";
            await c.save();
            return done({
              success: false,
              message: "Bài đăng đã đóng, không thể gửi tin nhắn",
            });
          }
          const message = await Message.create({
            conversation_id,
            sender_id: socket.data.userId,
            text: content,
          });
          c.last_message = content;
          c.last_message_at = new Date();
          await c.save();
          io.to(String(conversation_id)).emit("receive_message", message);
          const recipientId =
            c.tenant_id === socket.data.userId ? c.landlord_id : c.tenant_id;
          Notifications.notify(
            recipientId,
            "NEW_MESSAGE",
            "Tin nhắn mới",
            content.slice(0, 120),
            { conversation_id: String(conversation_id), post_id: c.post_id },
          );
          done({ success: true });
        } catch (err) {
          console.error("Chat send failed:", err.message);
          done({ success: false, message: "Không gửi được tin nhắn" });
        }
      },
    );
  });
};
