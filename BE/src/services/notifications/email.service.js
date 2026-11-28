import nodemailer from 'nodemailer'
import { createHttpError } from '../../utils/http.js'

// Without SMTP, a developer reads the link from the log. A deployed site must never log it:
// whoever reads the log could take over the invited account.
function isLocalDevelopment() {
  const { hostname } = new URL(process.env.FRONTEND_URL || 'http://localhost:5173')
  return ['localhost', '127.0.0.1'].includes(hostname)
}

export function assertInvitationEmailAvailable() {
  if (process.env.SMTP_HOST || isLocalDevelopment()) return
  throw createHttpError(503, 'Chưa cấu hình gửi email nên không thể mời thành viên. Vui lòng liên hệ quản trị viên hệ thống.')
}

export async function sendInvitationEmail({ to, farmName, token }) {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/set-password?token=${token}`
  if (!process.env.SMTP_HOST) {
    assertInvitationEmailAvailable()
    console.log(`Invitation for ${to}: ${url}`)
    return
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Lời mời tham gia trại ${farmName}`,
    text: `Bạn được mời tham gia trại ${farmName}. Mở liên kết để đặt mật khẩu (hết hạn sau 1 ngày): ${url}`,
    html: `<p>Bạn được mời tham gia trại <strong>${farmName}</strong>.</p><p><a href="${url}">Đặt mật khẩu và chấp nhận lời mời</a></p><p>Liên kết hết hạn sau 1 ngày.</p>`,
  })
}
