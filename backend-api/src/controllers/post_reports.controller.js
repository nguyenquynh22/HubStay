const Repo = require("../repositories/post_reports.repository");
const db = require("../common/db");
const Notifications = require("../services/notifications.service");
const {
  uploadBase64Image,
  deleteImageByUrl,
} = require("../services/cloudinary.service");

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};
const allowedReasons = new Set([
  "Lừa đảo",
  "Báo giá sai",
  "Phòng không đúng ảnh",
  "Nội dung không phù hợp",
]);

module.exports = {
  getAll: async (req, res, next) => {
    try {
      const data = await Repo.getAll();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req, res, next) => {
    try {
      const item = await Repo.getById(req.params.id);
      if (!item)
        return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const postId = parseId(req.body.post_id);
      const reporterId = res.locals.user.userId;
      const reason =
        typeof req.body.reason === "string" ? req.body.reason.trim() : "";
      const description =
        typeof req.body.description === "string"
          ? req.body.description.trim()
          : "";
      const evidenceImage =
        typeof req.body.evidence_image_url === "string"
          ? req.body.evidence_image_url.trim()
          : "";

      if (!postId) {
        return res.status(400).json({
          success: false,
          message: "post_id không hợp lệ.",
        });
      }
      if (req.body.reporter_id && Number(req.body.reporter_id) !== reporterId)
        return res.status(403).json({
          success: false,
          message: "Không thể gửi báo cáo thay cho tài khoản khác.",
        });
      if (!allowedReasons.has(reason)) {
        return res
          .status(400)
          .json({ success: false, message: "Lý do báo cáo không hợp lệ." });
      }
      if (description.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Mô tả báo cáo không được vượt quá 1000 ký tự.",
        });
      }

      const [postRows] = await db.query(
        "SELECT post_id, author_id FROM posts WHERE post_id = ? LIMIT 1",
        [postId],
      );
      const post = postRows[0];
      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bài đăng cần báo cáo.",
        });
      }
      if (Number(post.author_id) === reporterId) {
        return res.status(400).json({
          success: false,
          message: "Bạn không thể báo cáo bài đăng của chính mình.",
        });
      }

      let evidenceImageUrl = null;
      if (evidenceImage) {
        try {
          evidenceImageUrl = await uploadBase64Image(
            evidenceImage,
            "post-reports",
          );
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: error.message || "Không tải được ảnh chứng minh.",
          });
        }
      }

      let data;
      try {
        data = await Repo.create({
          post_id: postId,
          reporter_id: reporterId,
          reason,
          description: description || null,
          evidence_image_url: evidenceImageUrl,
        });
      } catch (error) {
        if (evidenceImageUrl)
          await deleteImageByUrl(evidenceImageUrl).catch(() => {});
        throw error;
      }

      try {
        const [adminRows] = await db.query(
          "SELECT user_id FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'",
        );
        await Promise.all(
          adminRows.map(({ user_id }) =>
            Notifications.notify(
              user_id,
              "POST_REPORT_NEW",
              "Có báo cáo bài đăng mới",
              `Bài đăng #${postId} vừa được báo cáo vì: ${reason}`,
              { report_id: data.report_id, post_id: postId },
            ),
          ),
        );
      } catch (notificationError) {
        console.error(
          "Report created but admin notification failed:",
          notificationError.message,
        );
      }

      res.status(201).json({
        success: true,
        message: "Báo cáo đã được gửi thành công và đang chờ xử lý.",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const updated = await Repo.update(req.params.id, req.body);
      res.json({
        success: true,
        message: "Updated successfully",
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const success = await Repo.delete(req.params.id);
      if (!success)
        return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
      next(err);
    }
  },
};
