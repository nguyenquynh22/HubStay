const nodemailer = require("nodemailer");

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

async function sendActivationEmail({ email, fullName, token }) {
  const sender = process.env.GMAIL_USER?.trim();
  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  const activationUrl = process.env.USER_ACTIVATION_URL?.trim();
  if (!sender || !appPassword || !activationUrl) {
    return { sent: false, reason: "Chưa cấu hình Gmail để gửi email kích hoạt." };
  }

  let link;
  try {
    link = new URL(activationUrl);
    if (!["http:", "https:"].includes(link.protocol)) throw new Error("Invalid activation URL protocol.");
  } catch {
    return { sent: false, reason: "USER_ACTIVATION_URL chưa phải là một URL hợp lệ." };
  }
  link.searchParams.set("token", token);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: sender, pass: appPassword },
  });

  await transporter.sendMail({
    from: { name: "HubStay", address: sender },
    to: email,
    subject: "Kích hoạt tài khoản HubStay",
    text: `Xin chào ${fullName},\n\nMở liên kết sau để tự đặt mật khẩu và kích hoạt tài khoản HubStay (có hiệu lực trong 48 giờ):\n${link.toString()}\n\nNếu bạn không yêu cầu tạo tài khoản, hãy bỏ qua email này.`,
    html: `<p>Xin chào ${escapeHtml(fullName)},</p><p>Mở liên kết sau để tự đặt mật khẩu và kích hoạt tài khoản HubStay. Liên kết có hiệu lực trong 48 giờ và chỉ sử dụng được một lần.</p><p><a href="${escapeHtml(link.toString())}">Kích hoạt tài khoản HubStay</a></p><p>Nếu bạn không yêu cầu tạo tài khoản, hãy bỏ qua email này.</p>`,
  });
  return { sent: true };
}

module.exports = { sendActivationEmail };
