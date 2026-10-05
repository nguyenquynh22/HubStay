const Repo = require("../repositories/rental_requests.repository");
const Conversation = require("../models/conversation.model");
const Notifications = require("../services/notifications.service");

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const respondToError = (res, error) => {
  const responses = {
    POST_NOT_FOUND: [404, "Bài đăng không tồn tại"],
    REQUEST_NOT_FOUND: [404, "Yêu cầu không tồn tại"],
    FORBIDDEN: [403, "Bạn không có quyền thực hiện thao tác này"],
    OWN_POST: [403, "Bạn không thể gửi yêu cầu thuê bài của chính mình"],
    POST_UNAVAILABLE: [409, "Bài đăng không còn khả dụng"],
    REQUEST_EXISTS: [409, "Bạn đã có yêu cầu thuê đang chờ xử lý"],
    REQUEST_NOT_PENDING: [409, "Yêu cầu không còn ở trạng thái chờ xử lý"],
  };
  const [status, message] = responses[error] || [400, "Yêu cầu không hợp lệ"];
  return res.status(status).json({ success: false, message });
};

module.exports = {
  getAll: async (req, res, next) => {
    try {
      const data = await Repo.getAll();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getForUser: async (req, res, next) => {
    try {
      const userId = parseId(req.params.userId);
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "userId không hợp lệ" });
      const data = await Repo.getForUser(userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req, res, next) => {
    try {
      const item = await Repo.getById(req.params.id);
      if (!item)
        return res
          .status(404)
          .json({ success: false, message: "Yêu cầu không tồn tại" });
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  getByPost: async (req, res, next) => {
    try {
      const data = await Repo.getByPostId(req.params.postId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const { post_id, tenant_id, note, status } = req.body;
      const postId = parseId(post_id);
      const tenantId = parseId(tenant_id);
      if (!postId || !tenantId) {
        return res.status(400).json({
          success: false,
          message: "post_id và tenant_id hợp lệ là bắt buộc",
        });
      }

      if (status && status !== "PENDING") {
        return res.status(400).json({
          success: false,
          message: "Yêu cầu mới phải ở trạng thái PENDING",
        });
      }
      const result = await Repo.createIfAvailable({
        post_id: postId,
        tenant_id: tenantId,
        note,
      });
      if (result.error) return respondToError(res, result.error);
      await Notifications.notify(
        result.author_id,
        "RENTAL_REQUEST_NEW",
        "Có yêu cầu thuê mới",
        "Một người thuê vừa gửi yêu cầu cho bài đăng của bạn.",
        { request_id: result.request_id, post_id: result.post_id },
      );
      res.status(201).json({
        success: true,
        message: "Tạo yêu cầu thuê thành công",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  updateStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      const validStatuses = ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"];
      const requestId = parseId(req.params.id);
      const actorId = parseId(req.body.actor_id);
      if (
        !requestId ||
        !actorId ||
        !status ||
        !validStatuses.includes(status)
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Trạng thái không hợp lệ" });
      }

      const result = await Repo.transitionStatus(requestId, actorId, status);
      if (result.error) return respondToError(res, result.error);
      if (status === "ACCEPTED") {
        await Conversation.updateMany(
          { post_id: result.post_id, is_closed: false },
          { $set: { is_closed: true, close_reason: "Bài đăng đã cho thuê" } },
        );
      }

      if (status === "ACCEPTED" || status === "REJECTED") {
        await Notifications.notify(
          result.tenant_id,
          `RENTAL_REQUEST_${status}`,
          status === "ACCEPTED"
            ? "Yêu cầu thuê được chấp nhận"
            : "Yêu cầu thuê bị từ chối",
          status === "ACCEPTED"
            ? "Chủ trọ đã xác nhận yêu cầu thuê của bạn."
            : "Chủ trọ không thể nhận yêu cầu thuê này.",
          { request_id: result.request_id, post_id: result.post_id },
        );
      }
      for (const tenantId of result.rejected_tenant_ids || []) {
        await Notifications.notify(
          tenantId,
          "RENTAL_REQUEST_REJECTED",
          "Yêu cầu thuê không còn khả dụng",
          "Bài đăng đã được chốt với một người thuê khác.",
          { post_id: result.post_id },
        );
      }
      res.json({
        success: true,
        message: "Cập nhật trạng thái thành công",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  markPostRented: async (req, res, next) => {
    try {
      const postId = parseId(req.params.postId);
      const actorId = parseId(req.body.actor_id);
      if (!postId || !actorId) {
        return res.status(400).json({
          success: false,
          message: "postId và actor_id hợp lệ là bắt buộc",
        });
      }
      const result = await Repo.markPostRented(postId, actorId);
      if (result.error) return respondToError(res, result.error);
      await Conversation.updateMany(
        { post_id: postId, is_closed: false },
        { $set: { is_closed: true, close_reason: "Bài đăng đã cho thuê" } },
      );
      for (const tenantId of result.rejected_tenant_ids || []) {
        await Notifications.notify(
          tenantId,
          "RENTAL_REQUEST_REJECTED",
          "Yêu cầu thuê không còn khả dụng",
          "Chủ trọ đã xác nhận bài đăng đã được cho thuê.",
          { post_id: postId },
        );
      }
      res.json({
        success: true,
        message: "Đã đánh dấu bài đăng cho thuê thành công",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const success = await Repo.delete(req.params.id);
      if (!success)
        return res
          .status(404)
          .json({ success: false, message: "Yêu cầu không tồn tại" });
      res.json({ success: true, message: "Xóa yêu cầu thành công" });
    } catch (err) {
      next(err);
    }
  },
};
