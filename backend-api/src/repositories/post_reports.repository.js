const db = require('../common/db');
const mongoose = require('mongoose');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');

class post_reportsRepository {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM post_reports');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM post_reports WHERE report_id = ?', [id]);
    return rows[0] || null;
  }

  static async getReportEligibility(postId, reporterId) {
    const [posts] = await db.query(
      'SELECT post_id, author_id FROM posts WHERE post_id = ? LIMIT 1',
      [postId],
    );
    const post = posts[0];
    if (!post) {
      return { eligible: false, message: 'Bài đăng không còn tồn tại.' };
    }
    if (Number(post.author_id) === Number(reporterId)) {
      return { eligible: false, message: 'Bạn không thể báo cáo bài đăng của chính mình.' };
    }

    const [[appointments], [rentalRequests]] = await Promise.all([
      db.query(
        'SELECT appointment_id FROM appointments WHERE post_id = ? AND tenant_id = ? LIMIT 1',
        [postId, reporterId],
      ),
      db.query(
        'SELECT request_id FROM rental_requests WHERE post_id = ? AND tenant_id = ? LIMIT 1',
        [postId, reporterId],
      ),
    ]);
    if (appointments.length || rentalRequests.length) {
      return {
        eligible: true,
        message: 'Bạn đủ điều kiện báo cáo bài đăng này.',
      };
    }

    const conversations = await Conversation.find({
      post_id: Number(postId),
      tenant_id: Number(reporterId),
      landlord_id: Number(post.author_id),
    })
      .select('_id')
      .lean();
    if (conversations.length) {
      const hasSentMessage = await Message.exists({
        conversation_id: { $in: conversations.map((conversation) => conversation._id) },
        sender_id: Number(reporterId),
      });
      if (hasSentMessage) {
        return {
          eligible: true,
          message: 'Bạn đủ điều kiện báo cáo bài đăng này.',
        };
      }
    }

    return {
      eligible: false,
      message: 'Bạn cần có ít nhất một tương tác thực tế với bài đăng trước khi báo cáo: gửi tin nhắn trong cuộc trò chuyện, đặt lịch xem phòng hoặc gửi yêu cầu thuê.',
    };
  }

  static async getInteractionEvidenceForReports(reportRows) {
    const evidenceByReport = new Map();
    const uniquePairs = new Map();
    const reportIdsByPair = new Map();
    for (const row of reportRows) {
      const postId = Number(row.post_id);
      const reporterId = Number(row.reporter_id);
      if (!Number.isInteger(postId) || !Number.isInteger(reporterId) || postId < 1 || reporterId < 1) {
        continue;
      }
      const key = `${postId}:${reporterId}`;
      if (!uniquePairs.has(key)) {
        uniquePairs.set(key, {
          key,
          postId,
          reporterId,
          landlordId: Number(row.post_author_id),
        });
      }
      if (!reportIdsByPair.has(key)) reportIdsByPair.set(key, []);
      reportIdsByPair.get(key).push(Number(row.report_id));
      evidenceByReport.set(Number(row.report_id), {
        chat: null,
        appointmentId: null,
        rentalRequestId: null,
        chatLookupAvailable: true,
      });
    }
    const pairs = [...uniquePairs.values()];

    const queryReferences = async (table, idColumn) => {
      const references = new Map();
      for (let offset = 0; offset < pairs.length; offset += 100) {
        const batch = pairs.slice(offset, offset + 100);
        if (!batch.length) continue;
        const where = batch.map(() => '(post_id = ? AND tenant_id = ?)').join(' OR ');
        const values = batch.flatMap((pair) => [pair.postId, pair.reporterId]);
        const [rows] = await db.query(
          `SELECT post_id, tenant_id, MAX(${idColumn}) AS interaction_id FROM ${table} WHERE ${where} GROUP BY post_id, tenant_id`,
          values,
        );
        for (const row of rows) {
          const key = `${Number(row.post_id)}:${Number(row.tenant_id)}`;
          references.set(key, Number(row.interaction_id));
        }
      }
      return references;
    };

    const [appointments, rentalRequests] = await Promise.all([
      queryReferences('appointments', 'appointment_id'),
      queryReferences('rental_requests', 'request_id'),
    ]);
    for (const pair of pairs) {
      const evidence = {
        chat: null,
        appointmentId: appointments.get(pair.key) ?? null,
        rentalRequestId: rentalRequests.get(pair.key) ?? null,
        chatLookupAvailable: true,
      };
      for (const reportId of reportIdsByPair.get(pair.key) ?? []) evidenceByReport.set(reportId, evidence);
    }

    const chatPairs = pairs.filter((pair) =>
      Number.isInteger(pair.landlordId) && pair.landlordId > 0,
    );
    try {
      const conversationsById = new Map();
      for (let offset = 0; offset < chatPairs.length; offset += 100) {
        const batch = chatPairs.slice(offset, offset + 100);
        const conversations = await Conversation.find({
          $or: batch.map((pair) => ({
            post_id: pair.postId,
            tenant_id: pair.reporterId,
            landlord_id: pair.landlordId,
          })),
        })
          .select('_id post_id tenant_id landlord_id')
          .lean();
        for (const conversation of conversations) {
          conversationsById.set(String(conversation._id), conversation);
        }
      }
      const conversationIds = [...conversationsById.keys()];
      const pairByConversation = new Map();
      for (const conversation of conversationsById.values()) {
        pairByConversation.set(
          String(conversation._id),
          `${Number(conversation.post_id)}:${Number(conversation.tenant_id)}`,
        );
      }
      for (let offset = 0; offset < conversationIds.length; offset += 100) {
        const batchIds = conversationIds.slice(offset, offset + 100);
        const batchObjectIds = batchIds.map((id) => new mongoose.Types.ObjectId(id));
        const senderIds = batchIds.map((id) => Number(conversationsById.get(id)?.tenant_id));
        const messages = await Message.aggregate([
          {
            $match: {
              conversation_id: { $in: batchObjectIds },
              sender_id: { $in: senderIds },
            },
          },
          { $sort: { createdAt: 1 } },
          {
            $group: {
              _id: { conversation_id: '$conversation_id', sender_id: '$sender_id' },
              message_id: { $first: '$_id' },
              createdAt: { $first: '$createdAt' },
            },
          },
        ]);
        for (const message of messages) {
          const conversationId = String(message._id.conversation_id);
          const pairKey = pairByConversation.get(conversationId);
          if (!pairKey || Number(message._id.sender_id) !== Number(conversationsById.get(conversationId)?.tenant_id)) continue;
          if (!uniquePairs.has(pairKey)) continue;
          const chatEvidence = {
            conversationId,
            messageId: String(message.message_id),
            messageAt: message.createdAt ?? null,
          };
          for (const reportId of reportIdsByPair.get(pairKey) ?? []) {
            const current = evidenceByReport.get(reportId);
            if (current && !current.chat) current.chat = chatEvidence;
          }
        }
      }
    } catch {
      for (const evidence of evidenceByReport.values()) {
        evidence.chatLookupAvailable = false;
      }
    }
    return evidenceByReport;
  }

  static async create(data) {
    const eligibility = await this.getReportEligibility(data.post_id, data.reporter_id);
    if (!eligibility.eligible) {
      const error = new Error(eligibility.message);
      error.statusCode = eligibility.message === 'Bài đăng không còn tồn tại.' ? 404 : 403;
      throw error;
    }
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [posts] = await connection.query(
        'SELECT post_id, author_id, title, status, is_approved FROM posts WHERE post_id = ? FOR UPDATE',
        [data.post_id],
      );
      const post = posts[0];
      if (!post) {
        const error = new Error('Bài đăng không còn tồn tại.');
        error.statusCode = 404;
        throw error;
      }
      if (Number(post.author_id) === Number(data.reporter_id)) {
        const error = new Error('Bạn không thể báo cáo bài đăng của chính mình.');
        error.statusCode = 400;
        throw error;
      }
      const normalizedReason = data.reason.trim().toLocaleLowerCase();
      const normalizedDescription = (data.description ?? '').trim();
      const [duplicates] = await connection.query(
        "SELECT report_id FROM post_reports WHERE post_id = ? AND reporter_id = ? AND LOWER(TRIM(reason)) = ? AND COALESCE(TRIM(description), '') = ? LIMIT 1 FOR UPDATE",
        [
          data.post_id,
          data.reporter_id,
          normalizedReason,
          normalizedDescription,
        ],
      );
      if (duplicates[0]) {
        const error = new Error('Bạn đã gửi báo cáo cho bài đăng này với cùng lý do và mô tả. Hãy bổ sung thông tin mới nếu phát hiện vấn đề khác.');
        error.statusCode = 409;
        throw error;
      }

      if (post.status !== 'AVAILABLE' || !Number(post.is_approved)) {
        const error = new Error('Bài đăng này hiện không nhận báo cáo mới.');
        error.statusCode = 409;
        throw error;
      }

      const [result] = await connection.query('INSERT INTO post_reports SET ?', [data]);
      const [counts] = await connection.query(
        "SELECT COUNT(DISTINCT reporter_id) AS pending_count FROM post_reports WHERE post_id = ? AND status = 'PENDING'",
        [data.post_id],
      );
      const pendingCount = Number(counts[0]?.pending_count ?? 0);
      let postStatus = post.status;
      if (pendingCount >= 3 && post.status === 'AVAILABLE' && Number(post.is_approved)) {
        const [hidden] = await connection.query(
          "UPDATE posts SET status = 'HIDDEN' WHERE post_id = ? AND status = 'AVAILABLE' AND is_approved = 1",
          [data.post_id],
        );
        if (hidden.affectedRows) {
          postStatus = 'HIDDEN';
          await connection.query(
            'INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)',
            [
              post.author_id,
              'POST_AUTO_HIDDEN_REPORT_THRESHOLD',
              'Bài đăng tạm ẩn để kiểm tra',
              'Bài đăng nhận được ít nhất 3 báo cáo đang chờ xử lý nên tạm thời không hiển thị công khai.',
              JSON.stringify({ post_id: Number(data.post_id), reason: 'REPORT_THRESHOLD' }),
            ],
          );
        }
      }
      await connection.commit();
      return {
        report_id: result.insertId,
        ...data,
        status: 'PENDING',
        pending_count: pendingCount,
        post_status: postStatus,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async review(id, status) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [reportRows] = await connection.query(
        'SELECT report_id, post_id FROM post_reports WHERE report_id = ?',
        [id],
      );
      if (!reportRows[0]) {
        const error = new Error('Không tìm thấy báo cáo.');
        error.statusCode = 404;
        throw error;
      }
      const [posts] = await connection.query(
        'SELECT post_id, author_id FROM posts WHERE post_id = ?',
        [reportRows[0].post_id],
      );
      if (!posts[0]) {
        const error = new Error('Bài đăng không còn tồn tại.');
        error.statusCode = 409;
        throw error;
      }
      const [owners] = await connection.query(
        'SELECT user_id, full_name, status, banned_until, ban_reason, (banned_until IS NOT NULL AND banned_until > NOW()) AS posting_restricted FROM users WHERE user_id = ? FOR UPDATE',
        [posts[0].author_id],
      );
      const owner = owners[0];
      if (!owner) {
        const error = new Error('Không tìm thấy chủ bài đăng.');
        error.statusCode = 409;
        throw error;
      }
      const [lockedPosts] = await connection.query(
        'SELECT post_id, author_id, title, status, is_approved FROM posts WHERE post_id = ? FOR UPDATE',
        [reportRows[0].post_id],
      );
      const post = lockedPosts[0];
      if (!post) {
        const error = new Error('Bài đăng không còn tồn tại.');
        error.statusCode = 409;
        throw error;
      }
      const [lockedReports] = await connection.query(
        'SELECT report_id, post_id, reporter_id, status FROM post_reports WHERE report_id = ? FOR UPDATE',
        [id],
      );
      const report = lockedReports[0];
      if (!report || report.status !== 'PENDING') {
        const error = new Error(report ? 'Báo cáo này đã được xử lý.' : 'Không tìm thấy báo cáo.');
        error.statusCode = report ? 409 : 404;
        throw error;
      }

      let strikeCount = null;
      let postStatus = post.status;
      let sanction = null;
      let pendingReportCount = 0;
      if (status === 'RESOLVED') {
        const [relatedReports] = await connection.query(
          "SELECT report_id, reporter_id FROM post_reports WHERE post_id = ? AND status = 'PENDING'",
          [report.post_id],
        );
        const [postsToHide] = await connection.query(
          "SELECT post_id, status FROM posts WHERE author_id = ? AND status <> 'HIDDEN'",
          [post.author_id],
        );
        await connection.query(
          'INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)',
          [
            post.author_id,
            'POST_REPORT_DECISION_APPLIED',
            'Kết luận báo cáo vi phạm',
            `Bài đăng "${post.title ?? 'của bạn'}" đã bị xác nhận vi phạm.`,
            JSON.stringify({
              post_id: Number(report.post_id),
              report_id: Number(id),
              previous_post_status: post.status,
              previous_user_status: owner.status,
              previous_banned_until: owner.banned_until,
              previous_ban_reason: owner.ban_reason,
            }),
          ],
        );
        await connection.query(
          "UPDATE post_reports SET status = 'RESOLVED' WHERE post_id = ? AND status = 'PENDING'",
          [report.post_id],
        );
        pendingReportCount = 0;
        for (const relatedReport of relatedReports) {
          await connection.query(
            'INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)',
            [
              relatedReport.reporter_id,
              'POST_REPORT_RESOLVED',
              'Báo cáo đã được xác nhận',
              'Quản trị viên đã xác nhận bài đăng vi phạm và gỡ bài khỏi danh sách công khai.',
              JSON.stringify({ post_id: Number(report.post_id), report_id: Number(relatedReport.report_id) }),
            ],
          );
        }
        await connection.query(
          "UPDATE posts SET status = 'HIDDEN' WHERE post_id = ?",
          [report.post_id],
        );
        postStatus = 'HIDDEN';

        const [strikes] = await connection.query(
          "SELECT COUNT(DISTINCT p.post_id) AS strike_count FROM post_reports r JOIN posts p ON p.post_id = r.post_id WHERE p.author_id = ? AND r.status = 'RESOLVED'",
          [post.author_id],
        );
        strikeCount = Number(strikes[0]?.strike_count ?? 0);

        let notificationTitle;
        let notificationBody;
        let notificationType;
        if (strikeCount === 1) {
          notificationType = 'POST_VIOLATION_WARNING';
          notificationTitle = 'Cảnh báo vi phạm bài đăng';
          notificationBody = `Bài đăng "${post.title ?? 'của bạn'}" đã bị xác nhận vi phạm. Đây là cảnh cáo lần 1.`;
          sanction = 'WARNING';
          if (owner.status === 'ACTIVE' || owner.ban_reason === 'Cảnh cáo do có 1 bài đăng vi phạm.') {
            await connection.query(
              "UPDATE users SET status = 'WARNING', banned_until = NULL, ban_reason = ? WHERE user_id = ?",
              ['Cảnh cáo do có 1 bài đăng vi phạm.', post.author_id],
            );
          }
        } else if (strikeCount === 2) {
          notificationType = 'POSTING_SUSPENDED';
          notificationTitle = 'Tạm khóa quyền đăng bài';
          notificationBody = 'Bài đăng vi phạm lần thứ 2. Bạn không thể đăng bài mới trong 7 ngày; các bài đăng hiện có đã được tạm ẩn.';
          sanction = 'SEVEN_DAY_RESTRICTION';
          if (owner.status !== 'BANNED' || ['Cảnh cáo do có 1 bài đăng vi phạm.', 'Tạm khóa quyền đăng bài do có 2 bài đăng vi phạm.', 'Khóa vĩnh viễn do có từ 3 bài đăng vi phạm trở lên.'].includes(owner.ban_reason)) {
            await connection.query(
              "UPDATE users SET status = 'WARNING', banned_until = DATE_ADD(NOW(), INTERVAL 7 DAY), ban_reason = ? WHERE user_id = ?",
              ['Tạm khóa quyền đăng bài do có 2 bài đăng vi phạm.', post.author_id],
            );
          }
          await connection.query(
            "UPDATE posts SET status = 'HIDDEN' WHERE author_id = ? AND status <> 'HIDDEN'",
            [post.author_id],
          );
        } else if (strikeCount >= 3) {
          notificationType = 'ACCOUNT_PERMANENTLY_BANNED';
          notificationTitle = 'Tài khoản đã bị khóa';
          notificationBody = 'Tài khoản bị khóa vĩnh viễn do có từ 3 bài đăng vi phạm trở lên. Tất cả bài đăng đã bị ẩn.';
          sanction = 'PERMANENT_BAN';
          if (owner.status !== 'BANNED' || ['Cảnh cáo do có 1 bài đăng vi phạm.', 'Tạm khóa quyền đăng bài do có 2 bài đăng vi phạm.', 'Khóa vĩnh viễn do có từ 3 bài đăng vi phạm trở lên.'].includes(owner.ban_reason)) {
            await connection.query(
              "UPDATE users SET status = 'BANNED', banned_until = NULL, ban_reason = ? WHERE user_id = ?",
              ['Khóa vĩnh viễn do có từ 3 bài đăng vi phạm trở lên.', post.author_id],
            );
          }
          await connection.query(
            "UPDATE posts SET status = 'HIDDEN' WHERE author_id = ? AND status <> 'HIDDEN'",
            [post.author_id],
          );
        }
        if (notificationType) {
          await connection.query(
            'INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)',
            [
              post.author_id,
              notificationType,
              notificationTitle,
              notificationBody,
              JSON.stringify({
                post_id: Number(report.post_id),
                report_id: Number(id),
                strike_count: strikeCount,
                hidden_posts: postsToHide.map((item) => ({
                  post_id: Number(item.post_id),
                  previous_status: item.status,
                })),
              }),
            ],
          );
        }
      } else {
        await connection.query(
          'UPDATE post_reports SET status = ? WHERE report_id = ?',
          [status, id],
        );
        await connection.query(
          'INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)',
          [
            report.reporter_id,
            'POST_REPORT_DISMISSED',
            'Báo cáo đã được xem xét',
            'Quản trị viên đã xem xét và kết luận bài đăng không vi phạm.',
            JSON.stringify({ post_id: Number(report.post_id), report_id: Number(id) }),
          ],
        );
        const [pendingRows] = await connection.query(
          "SELECT COUNT(DISTINCT reporter_id) AS pending_count FROM post_reports WHERE post_id = ? AND status = 'PENDING'",
          [report.post_id],
        );
        const remainingPending = Number(pendingRows[0]?.pending_count ?? 0);
        pendingReportCount = remainingPending;
        const [autoHideMarkers] = await connection.query(
          "SELECT notification_id FROM notifications WHERE user_id = ? AND type = 'POST_AUTO_HIDDEN_REPORT_THRESHOLD' AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.post_id')) = ? ORDER BY created_at DESC LIMIT 1",
          [post.author_id, String(report.post_id)],
        );
        const restrictionActive = owner.status === 'BANNED' || Boolean(owner.posting_restricted);
        if (
          remainingPending === 0 &&
          autoHideMarkers[0] &&
          post.status === 'HIDDEN' &&
          Number(post.is_approved) === 1 &&
          !restrictionActive
        ) {
          await connection.query(
            "UPDATE posts SET status = 'AVAILABLE' WHERE post_id = ? AND status = 'HIDDEN'",
            [report.post_id],
          );
          postStatus = 'AVAILABLE';
          await connection.query(
            "UPDATE notifications SET type = 'POST_AUTO_HIDE_RESTORED' WHERE notification_id = ?",
            [autoHideMarkers[0].notification_id],
          );
        }
      }

      await connection.commit();
      return { status, postStatus, strikeCount, sanction, pendingReportCount };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async undoDecision(id, reason) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
          const [reportRows] = await connection.query(
            'SELECT report_id, post_id, status FROM post_reports WHERE report_id = ?',
            [id],
          );
          if (!reportRows[0]) {
            const error = new Error('Không tìm thấy báo cáo.');
            error.statusCode = 404;
            throw error;
          }
          const [postRows] = await connection.query(
            'SELECT post_id, author_id, title, status, is_approved FROM posts WHERE post_id = ? FOR UPDATE',
            [reportRows[0].post_id],
          );
          const post = postRows[0];
          if (!post) {
            const error = new Error('Bài đăng không còn tồn tại.');
            error.statusCode = 409;
            throw error;
          }
          const [owners] = await connection.query(
            'SELECT user_id, full_name, status, banned_until, ban_reason, (banned_until IS NOT NULL AND banned_until > NOW()) AS posting_restricted FROM users WHERE user_id = ? FOR UPDATE',
            [post.author_id],
          );
          const owner = owners[0];
          if (!owner) {
            const error = new Error('Không tìm thấy chủ bài đăng.');
            error.statusCode = 409;
            throw error;
          }
          const [lockedReports] = await connection.query(
            'SELECT report_id, post_id, reporter_id, status FROM post_reports WHERE post_id = ? AND status = ? FOR UPDATE',
            [post.post_id, 'RESOLVED'],
          );
          if (!lockedReports.length) {
            if (reportRows[0].status === 'DISMISSED') {
              const [reversalMarkers] = await connection.query(
                "SELECT notification_id FROM notifications WHERE user_id = ? AND type = 'POST_REPORT_DECISION_REVERSED' AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.report_id')) = ? ORDER BY created_at DESC LIMIT 1",
                [owner.user_id, String(id)],
              );
              if (reversalMarkers[0]) {
                const [decisionMarkers] = await connection.query(
                  "SELECT data FROM notifications WHERE user_id = ? AND type IN ('POST_REPORT_DECISION_APPLIED', 'POST_REPORT_DECISION_REVERSED') AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.post_id')) = ? ORDER BY created_at DESC LIMIT 1",
                  [owner.user_id, String(post.post_id)],
                );
                let previousStatus = null;
                if (decisionMarkers[0]?.data) {
                  const markerData = typeof decisionMarkers[0].data === 'string'
                    ? JSON.parse(decisionMarkers[0].data)
                    : decisionMarkers[0].data;
                  previousStatus = markerData.previous_post_status ?? null;
                }
                if (!previousStatus && post.status === 'HIDDEN') previousStatus = 'AVAILABLE';
                if (previousStatus === 'HIDDEN') {
                  const [autoHideMarkers] = await connection.query(
                    "SELECT notification_id FROM notifications WHERE user_id = ? AND type IN ('POST_AUTO_HIDDEN_REPORT_THRESHOLD', 'POST_AUTO_HIDE_RESTORED') AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.post_id')) = ? ORDER BY created_at DESC LIMIT 1",
                    [owner.user_id, String(post.post_id)],
                  );
                  if (autoHideMarkers[0]) previousStatus = 'AVAILABLE';
                }
                const [strikes] = await connection.query(
                  "SELECT COUNT(DISTINCT p.post_id) AS strike_count FROM post_reports r JOIN posts p ON p.post_id = r.post_id WHERE p.author_id = ? AND r.status = 'RESOLVED'",
                  [owner.user_id],
                );
                const [pendingRows] = await connection.query(
                  "SELECT COUNT(DISTINCT reporter_id) AS pending_count FROM post_reports WHERE post_id = ? AND status = 'PENDING'",
                  [post.post_id],
                );
                const strikeCount = Number(strikes[0]?.strike_count ?? 0);
                const pendingReportCount = Number(pendingRows[0]?.pending_count ?? 0);
                const hasReportSanction = [
                  'Cảnh cáo do có 1 bài đăng vi phạm.',
                  'Tạm khóa quyền đăng bài do có 2 bài đăng vi phạm.',
                  'Khóa vĩnh viễn do có từ 3 bài đăng vi phạm trở lên.',
                ].includes(owner.ban_reason);
                const blockedBySanction = strikeCount >= 2 ||
                  (owner.status === 'BANNED' && !hasReportSanction);
                let postStatus = 'HIDDEN';
                if (!blockedBySanction && pendingReportCount < 3 &&
                    Number(post.is_approved) === 1 &&
                    ['AVAILABLE', 'RENTED'].includes(previousStatus)) {
                  await connection.query(
                    'UPDATE posts SET status = ? WHERE post_id = ? AND status = ? AND is_approved = 1',
                    [previousStatus, post.post_id, post.status],
                  );
                  postStatus = previousStatus;
                }
                await connection.commit();
                return {
                  status: 'DISMISSED',
                  postStatus,
                  strikeCount,
                  sanction: blockedBySanction ? 'ACTIVE_SANCTION' : 'NO_ACTIVE_SANCTION',
                  pendingReportCount,
                };
              }
            }
            const error = new Error('Bài đăng này không có kết luận vi phạm nào để hoàn tác.');
            error.statusCode = 409;
            throw error;
          }
          if (!lockedReports.some((item) => Number(item.report_id) === Number(id))) {
            const error = new Error('Báo cáo này chưa được chấp thuận hoặc đã được hoàn tác.');
            error.statusCode = 409;
            throw error;
          }

          const [decisionMarkers] = await connection.query(
            "SELECT notification_id, data FROM notifications WHERE user_id = ? AND type IN ('POST_REPORT_DECISION_APPLIED', 'POST_REPORT_DECISION_REVERSED') AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.post_id')) = ? ORDER BY created_at DESC LIMIT 1",
            [owner.user_id, String(post.post_id)],
          );
          let previousPostStatus = null;
          if (decisionMarkers[0]?.data) {
            const markerData = typeof decisionMarkers[0].data === 'string'
              ? JSON.parse(decisionMarkers[0].data)
              : decisionMarkers[0].data;
            previousPostStatus = markerData.previous_post_status ?? null;
          }
          if (previousPostStatus === 'HIDDEN') {
            const [autoHideMarkers] = await connection.query(
              "SELECT notification_id FROM notifications WHERE user_id = ? AND type IN ('POST_AUTO_HIDDEN_REPORT_THRESHOLD', 'POST_AUTO_HIDE_RESTORED') AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.post_id')) = ? ORDER BY created_at DESC LIMIT 1",
              [owner.user_id, String(post.post_id)],
            );
            if (autoHideMarkers[0]) previousPostStatus = 'AVAILABLE';
          } else if (!previousPostStatus) {
            const [autoHideMarkers] = await connection.query(
              "SELECT notification_id FROM notifications WHERE user_id = ? AND type IN ('POST_AUTO_HIDDEN_REPORT_THRESHOLD', 'POST_AUTO_HIDE_RESTORED') AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.post_id')) = ? ORDER BY created_at DESC LIMIT 1",
              [owner.user_id, String(post.post_id)],
            );
            if (autoHideMarkers[0] || post.status === 'HIDDEN') {
              previousPostStatus = 'AVAILABLE';
            }
          }

          await connection.query(
            "UPDATE post_reports SET status = 'DISMISSED' WHERE post_id = ? AND status = 'RESOLVED'",
            [post.post_id],
          );
          const reversalBody = `Kết luận vi phạm đã được hoàn tác. Lý do: ${reason}`;
          for (const report of lockedReports) {
            await connection.query(
              'INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)',
              [
                report.reporter_id,
                'POST_REPORT_DECISION_REVERSED',
                'Kết luận báo cáo đã được thay đổi',
                reversalBody.slice(0, 500),
                JSON.stringify({
                  post_id: Number(post.post_id),
                  report_id: Number(report.report_id),
                  reason,
                }),
              ],
            );
          }

          const [strikes] = await connection.query(
            "SELECT COUNT(DISTINCT p.post_id) AS strike_count FROM post_reports r JOIN posts p ON p.post_id = r.post_id WHERE p.author_id = ? AND r.status = 'RESOLVED'",
            [owner.user_id],
          );
          const strikeCount = Number(strikes[0]?.strike_count ?? 0);
          let sanction = null;
          const permanentBanReason = 'Khóa vĩnh viễn do có từ 3 bài đăng vi phạm trở lên.';
          const temporaryBanReason = 'Tạm khóa quyền đăng bài do có 2 bài đăng vi phạm.';
          const warningReason = 'Cảnh cáo do có 1 bài đăng vi phạm.';
          const hasReportSanction = [warningReason, permanentBanReason, temporaryBanReason].includes(owner.ban_reason);

          if (strikeCount >= 3) {
            sanction = 'PERMANENT_BAN';
            if (owner.status !== 'BANNED' || hasReportSanction) {
              await connection.query(
                "UPDATE users SET status = 'BANNED', banned_until = NULL, ban_reason = ? WHERE user_id = ?",
                [permanentBanReason, owner.user_id],
              );
            }
            await connection.query(
              "UPDATE posts SET status = 'HIDDEN' WHERE author_id = ? AND status <> 'HIDDEN'",
              [owner.user_id],
            );
          } else if (strikeCount === 2) {
            sanction = 'SEVEN_DAY_RESTRICTION';
            const [secondStrike] = await connection.query(
              "SELECT DATE_ADD(created_at, INTERVAL 7 DAY) AS banned_until FROM notifications WHERE user_id = ? AND type = 'POSTING_SUSPENDED' AND JSON_EXTRACT(data, '$.strike_count') = 2 ORDER BY created_at DESC LIMIT 1",
              [owner.user_id],
            );
            await connection.query(
              "UPDATE users SET status = 'WARNING', banned_until = COALESCE(?, DATE_ADD(NOW(), INTERVAL 7 DAY)), ban_reason = ? WHERE user_id = ? AND (status <> 'BANNED' OR ban_reason IN (?, ?))",
              [secondStrike[0]?.banned_until ?? null, temporaryBanReason, owner.user_id, permanentBanReason, temporaryBanReason],
            );
            await connection.query(
              "UPDATE posts SET status = 'HIDDEN' WHERE author_id = ? AND status <> 'HIDDEN'",
              [owner.user_id],
            );
          } else if (strikeCount === 1 && owner.status !== 'BANNED' &&
              (owner.status !== 'WARNING' || hasReportSanction)) {
            sanction = 'WARNING';
            await connection.query(
              "UPDATE users SET status = 'WARNING', banned_until = NULL, ban_reason = ? WHERE user_id = ?",
              [warningReason, owner.user_id],
            );
          } else if (hasReportSanction) {
            await connection.query(
              "UPDATE users SET status = ?, banned_until = NULL, ban_reason = ? WHERE user_id = ? AND ban_reason IN (?, ?, ?)",
              [
                strikeCount === 1 ? 'WARNING' : 'ACTIVE',
                strikeCount === 1 ? warningReason : null,
                owner.user_id,
                warningReason,
                permanentBanReason,
                temporaryBanReason,
              ],
            );
            sanction = strikeCount === 1 ? 'WARNING' : 'NO_ACTIVE_SANCTION';
          }
          if (strikeCount < 2 && hasReportSanction) {
            const [restrictionNotifications] = await connection.query(
              "SELECT data FROM notifications WHERE user_id = ? AND type = 'POSTING_SUSPENDED' ORDER BY created_at DESC LIMIT 1",
              [owner.user_id],
            );
            if (restrictionNotifications[0]?.data) {
              const sanctionData = typeof restrictionNotifications[0].data === 'string'
                ? JSON.parse(restrictionNotifications[0].data)
                : restrictionNotifications[0].data;
              for (const hiddenPost of sanctionData.hidden_posts ?? []) {
                if (hiddenPost.previous_status === 'AVAILABLE' || hiddenPost.previous_status === 'RENTED') {
                  await connection.query(
                    "UPDATE posts SET status = ? WHERE post_id = ? AND author_id = ? AND status = 'HIDDEN' AND is_approved = 1",
                    [hiddenPost.previous_status, hiddenPost.post_id, owner.user_id],
                  );
                }
              }
            }
          }

          const [pendingRows] = await connection.query(
            "SELECT COUNT(DISTINCT reporter_id) AS pending_count FROM post_reports WHERE post_id = ? AND status = 'PENDING'",
            [post.post_id],
          );
          const pendingReportCount = Number(pendingRows[0]?.pending_count ?? 0);
          let postStatus = 'HIDDEN';
          const hasActiveAccountRestriction =
            (owner.status === 'BANNED' && !hasReportSanction) ||
            strikeCount >= 2;
          if (!hasActiveAccountRestriction && Number(post.is_approved) === 1 &&
              pendingReportCount < 3 &&
              previousPostStatus &&
              ['AVAILABLE', 'RENTED'].includes(previousPostStatus)) {
            await connection.query(
              "UPDATE posts SET status = ? WHERE post_id = ? AND status = 'HIDDEN' AND is_approved = 1",
              [previousPostStatus, post.post_id],
            );
            postStatus = previousPostStatus;
            if (previousPostStatus === 'AVAILABLE') {
              const [autoHideMarkers] = await connection.query(
                "SELECT notification_id FROM notifications WHERE user_id = ? AND type = 'POST_AUTO_HIDDEN_REPORT_THRESHOLD' AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.post_id')) = ? ORDER BY created_at DESC LIMIT 1",
                [owner.user_id, String(post.post_id)],
              );
              if (autoHideMarkers[0]) {
                await connection.query(
                  "UPDATE notifications SET type = 'POST_AUTO_HIDE_RESTORED' WHERE notification_id = ?",
                  [autoHideMarkers[0].notification_id],
                );
              }
            }
          }

          await connection.query(
            'INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)',
            [
              owner.user_id,
              'POST_REPORT_DECISION_REVERSED',
              'Kết luận vi phạm đã được hoàn tác',
              reversalBody.slice(0, 500),
              JSON.stringify({
                post_id: Number(post.post_id),
                report_id: Number(id),
                reason,
                strike_count: strikeCount,
                sanction,
              }),
            ],
          );
          if (decisionMarkers[0]) {
            await connection.query(
              "UPDATE notifications SET type = 'POST_REPORT_DECISION_REVERSED' WHERE notification_id = ?",
              [decisionMarkers[0].notification_id],
            );
          }

          await connection.commit();
          return { status: 'DISMISSED', postStatus, strikeCount, sanction, pendingReportCount };
        } catch (error) {
          await connection.rollback();
          throw error;
    } finally {
      connection.release();
    }
  }

  static async update(id, data) {
    await db.query('UPDATE post_reports SET ? WHERE report_id = ?', [data, id]);
    return { report_id: id, ...data };
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM post_reports WHERE report_id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = post_reportsRepository;
