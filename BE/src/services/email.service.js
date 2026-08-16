import nodemailer from 'nodemailer'

export async function sendInvitationEmail({ to, farmName, token }) {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/set-password?token=${token}`
  if (!process.env.SMTP_HOST) {
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
    subject: `Lời mời vào trại ${farmName}`,
    text: `Mở link để thiết lập mật khẩu (hết hạn sau 7 ngày): ${url}`,
  })
}
