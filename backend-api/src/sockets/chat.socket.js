const jwt = require("jsonwebtoken");
const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const Posts = require("../repositories/posts.repository");
const Notifications = require("../services/notifications.service");

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const secret = process.env.JWT_SECRET;
    if (!token || !secret) return next(new Error("Vui lòng đăng nhập để chat"));
    try {
      const payload = jwt.verify(token, secret, { issuer: "hubstay-api" });
      const userId = Number(payload.sub);
      if (!Number.isInteger(userId) || userId < 1)
        return next(new Error("Phiên đăng nhập không hợp lệ"));
      socket.data.userId = userId;
      next();
    } catch {
      next(new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn"));
    }
  });

  io.on("connection", (socket) => {
    socket.on(
      "join_conversation",
      async ({ conversation_id } = {}, done = () => {}) => {
        try {
          const c = await Conversation.findById(conversation_id);
          if (!c || ![c.tenant_id, c.landlord_id].includes(socket.data.userId))
            return done({
              success: false,
              message: "Bạn không thuộc cuộc trò chuyện này",
            });
          const post = await Posts.getById(c.post_id);
          if (!post) {
            return done({
              success: false,
              message: "Bài đăng không còn tồn tại",
            });
          }
          if (c.is_closed && post.status === "AVAILABLE")
            return done({ success: false, message: "Cuộc trò chuyện đã đóng" });
          socket.join(String(conversation_id));
          done({ success: true, post_status: post.status });
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
          const post = await Posts.getById(c.post_id);
          if (c.is_closed)
            return done({
              success: false,
              message: "Cuộc trò chuyện đã đóng",
            });
          if (!post || post.status !== "AVAILABLE")
            return done({
              success: false,
              message:
                post?.status === "RENTED"
                  ? "Bài đăng đã có người thuê. Không thể gửi tin nhắn."
                  : "Bài đăng hiện không khả dụng để nhắn tin.",
            });
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
