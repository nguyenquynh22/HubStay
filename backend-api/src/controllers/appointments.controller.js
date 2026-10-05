const Repo = require("../repositories/appointments.repository");
const Notifications = require("../services/notifications.service");

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const isValidDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

const isValidTime = (value) =>
  typeof value === "string" &&
  /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);

const invalidAppointmentTime = (res) =>
  res.status(400).json({
    success: false,
    message: "Ngày phải theo YYYY-MM-DD và giờ đến theo HH:mm",
  });

module.exports = {
  getForLandlord: async (req, res, next) => {
    try {
      const landlordId = parseId(req.params.userId);
      if (!landlordId)
        return res
          .status(400)
          .json({ success: false, message: "userId không hợp lệ" });
      const order = req.query.sort === "oldest" ? "ASC" : "DESC";
      const data = await Repo.getForLandlord(landlordId, order);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getForTenant: async (req, res, next) => {
    try {
      const tenantId = parseId(req.params.userId);
      if (!tenantId)
        return res
          .status(400)
          .json({ success: false, message: "userId không hợp lệ" });
      const order = req.query.sort === "oldest" ? "ASC" : "DESC";
      const data = await Repo.getForTenant(tenantId, order);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const postId = parseId(req.body.post_id);
      const source = req.body.source === "EXTERNAL" ? "EXTERNAL" : "IN_APP";
      const actorId = parseId(
        source === "EXTERNAL" ? req.body.owner_id : req.body.tenant_id,
      );
      const appointmentDate = req.body.appointment_date;
      const appointmentTime = req.body.appointment_time;
      const guestName =
        typeof req.body.guest_name === "string"
          ? req.body.guest_name.trim()
          : "";
      const guestPhone =
        typeof req.body.guest_phone === "string"
          ? req.body.guest_phone.trim()
          : "";

      if (!postId || !actorId)
        return res.status(400).json({
          success: false,
          message: "Thiếu post_id hoặc user_id hợp lệ",
        });
      if (!isValidDate(appointmentDate) || !isValidTime(appointmentTime))
        return invalidAppointmentTime(res);

      const post = await Repo.getPost(postId);
      if (!post)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy bài đăng" });

      let tenantId = actorId;
      let status = "PENDING";
      if (source === "EXTERNAL") {
        if (Number(post.author_id) !== actorId)
          return res.status(403).json({
            success: false,
            message: "Chỉ chủ bài đăng mới thêm được lịch ngoài nền tảng",
          });
        if (!guestName || guestName.length > 100)
          return res.status(400).json({
            success: false,
            message: "Lịch ngoài app cần tên khách (tối đa 100 ký tự)",
          });
        if (
          guestPhone.length > 20 ||
          (guestPhone.match(/\d/g) || []).length < 7
        )
          return res.status(400).json({
            success: false,
            message: "Lịch ngoài app cần số điện thoại hợp lệ",
          });
        tenantId = null;
        status = "CONFIRMED";
      } else {
        if (Number(post.author_id) === actorId)
          return res.status(403).json({
            success: false,
            message: "Chủ bài đăng không thể tự đặt lịch xem phòng",
          });
        if (Number(post.enable_booking) !== 1)
          return res
            .status(400)
            .json({ success: false, message: "Bài đăng không bật đặt lịch" });
        if (post.status !== "AVAILABLE")
          return res.status(400).json({
            success: false,
            message: "Bài đăng không còn nhận lịch xem phòng",
          });
      }

      const data = await Repo.create({
        post_id: postId,
        tenant_id: tenantId,
        source,
        guest_name: source === "EXTERNAL" ? guestName : null,
        guest_phone: source === "EXTERNAL" ? guestPhone : null,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        note: typeof req.body.note === "string" ? req.body.note.trim() : null,
        status,
      });
      if (source === "IN_APP") {
        await Notifications.notify(
          Number(post.author_id),
          "APPOINTMENT_NEW",
          "Có lịch hẹn xem phòng mới",
          "Một người thuê vừa gửi yêu cầu đặt lịch xem phòng.",
          { appointment_id: data.appointment_id, post_id: postId },
        );
      }
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const appointmentId = parseId(req.params.id);
      const actorId = parseId(req.body.actor_id);
      if (!appointmentId || !actorId)
        return res.status(400).json({
          success: false,
          message: "appointment_id hoặc actor_id không hợp lệ",
        });

      const appointment = await Repo.getById(appointmentId);
      if (!appointment)
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy lịch hẹn" });

      const isLandlord = Number(appointment.landlord_id) === actorId;
      const isTenant = Number(appointment.tenant_id) === actorId;
      if (!isLandlord && !isTenant)
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền cập nhật lịch hẹn này",
        });
      if (appointment.status === "CANCELLED")
        return res
          .status(400)
          .json({ success: false, message: "Lịch đã hủy không thể cập nhật" });

      const data = {};
      if (
        req.body.appointment_date !== undefined ||
        req.body.appointment_time !== undefined
      ) {
        const date = req.body.appointment_date ?? appointment.appointment_date;
        const time = req.body.appointment_time ?? appointment.appointment_time;
        const dateValue =
          date instanceof Date
            ? date.toISOString().slice(0, 10)
            : String(date).slice(0, 10);
        const timeValue = String(time).slice(0, 8);
        if (!isValidDate(dateValue) || !isValidTime(timeValue))
          return invalidAppointmentTime(res);
        data.appointment_date = dateValue;
        data.appointment_time = timeValue;
      }
      if (req.body.note !== undefined)
        data.note =
          typeof req.body.note === "string" ? req.body.note.trim() : null;
      if (req.body.status !== undefined) {
        if (req.body.status === "CONFIRMED" && !isLandlord)
          return res.status(403).json({
            success: false,
            message: "Chỉ chủ bài đăng mới xác nhận lịch hẹn",
          });
        if (!["CONFIRMED", "CANCELLED"].includes(req.body.status))
          return res.status(400).json({
            success: false,
            message: "Trạng thái lịch hẹn không hợp lệ",
          });
        data.status = req.body.status;
      }
      if (!Object.keys(data).length)
        return res
          .status(400)
          .json({ success: false, message: "Không có thay đổi hợp lệ" });

      await Repo.update(appointmentId, data);
      if (data.status) {
        const recipientId = isLandlord
          ? Number(appointment.tenant_id)
          : Number(appointment.landlord_id);
        await Notifications.notify(
          recipientId,
          `APPOINTMENT_${data.status}`,
          data.status === "CONFIRMED"
            ? "Lịch hẹn đã được xác nhận"
            : "Lịch hẹn đã bị hủy",
          data.status === "CONFIRMED"
            ? "Chủ trọ đã xác nhận lịch xem phòng của bạn."
            : "Lịch xem phòng đã được hủy.",
          { appointment_id: appointmentId },
        );
      }
      res.json({
        success: true,
        data: { appointment_id: appointmentId, ...data },
      });
    } catch (err) {
      next(err);
    }
  },
};
