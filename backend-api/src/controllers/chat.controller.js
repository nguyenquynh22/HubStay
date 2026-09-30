const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const Posts = require("../repositories/posts.repository");
const Users = require("../repositories/users.repository");
const asId = (value) => Number(value);

module.exports = {
  createOrGet: async (req, res, next) => {
    try {
      const postId = asId(req.body.post_id), tenantId = asId(req.body.tenant_id);
      if (!Number.isInteger(postId) || !Number.isInteger(tenantId)) return res.status(400).json({ success: false, message: "post_id và tenant_id không hợp lệ" });
      const [post, tenant] = await Promise.all([Posts.getById(postId), Users.getById(tenantId)]);
      if (!post || !tenant) return res.status(404).json({ success: false, message: "Không tìm thấy bài đăng hoặc người dùng" });
      if (Number(post.author_id) === tenantId) return res.status(400).json({ success: false, message: "Bạn không thể nhắn tin cho chính mình" });
      const conversation = await Conversation.findOneAndUpdate({ post_id: postId, tenant_id: tenantId }, { $setOnInsert: { post_id: postId, landlord_id: Number(post.author_id), tenant_id: tenantId } }, { new: true, upsert: true, setDefaultsOnInsert: true });
      res.json({ success: true, data: { ...conversation.toObject(), post_title: post.title, peer_name: post.author_name } });
    } catch (err) { next(err); }
  },
  list: async (req, res, next) => {
    try {
      const userId = asId(req.params.userId);
      const conversations = await Conversation.find({ $or: [{ tenant_id: userId }, { landlord_id: userId }] }).sort({ last_message_at: -1 }).lean();
      const data = await Promise.all(conversations.map(async (c) => {
        const [post, peer] = await Promise.all([Posts.getById(c.post_id), Users.getById(c.tenant_id === userId ? c.landlord_id : c.tenant_id)]);
        return { ...c, post_title: post?.title || "Bài đăng đã đóng", peer_name: peer?.full_name || "Người dùng" };
      }));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  messages: async (req, res, next) => {
    try {
      const userId = asId(req.query.user_id), conversation = await Conversation.findById(req.params.id).lean();
      if (!conversation) return res.status(404).json({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
      if (![conversation.tenant_id, conversation.landlord_id].includes(userId)) return res.status(403).json({ success: false, message: "Bạn không thuộc cuộc trò chuyện này" });
      res.json({ success: true, data: await Message.find({ conversation_id: conversation._id }).sort({ createdAt: 1 }).lean() });
    } catch (err) { next(err); }
  },
};
