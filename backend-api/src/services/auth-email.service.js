const nodemailer = require("nodemailer");

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

async function sendAuthOtpEmail({ email, fullName, otp, purpose }) {
  const sender = process.env.GMAIL_USER?.trim();
  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!sender || !appPassword) {
    const error = new Error("Máy chủ chưa cấu hình gửi email OTP.");
    error.statusCode = 503;
    throw error;
  }

  const isRegistration = purpose === "REGISTER";
  const subject = isRegistration
    ? "Mã xác thực đăng ký HubStay"
    : "Mã xác thực đặt lại mật khẩu HubStay";
  const action = isRegistration ? "đăng ký tài khoản" : "đặt lại mật khẩu";
  const greeting = fullName ? `Xin chào ${fullName},` : "Xin chào,";
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: sender, pass: appPassword },
  });

  await transporter.sendMail({
    from: { name: "HubStay", address: sender },
    to: email,
    subject,
    text: `${greeting}\n\nMã OTP để ${action} HubStay của bạn là: ${otp}. Mã có hiệu lực trong 60 giây. Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.`,
    html: `<p>${escapeHtml(greeting)}</p><p>Mã OTP để ${escapeHtml(action)} HubStay của bạn là:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>Mã có hiệu lực trong 60 giây. Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>`,
  });
}

module.exports = { sendAuthOtpEmail };
