import { neonAuth } from '../auth/client.js'
import { withAuthContext } from '../auth/context.js'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

function validateNewPassword(password, confirmPassword) {
  if (typeof password !== 'string' || password.length < 8) throw createHttpError(400, 'Mật khẩu mới cần ít nhất 8 ký tự.')
  if (password !== confirmPassword) throw createHttpError(400, 'Mật khẩu xác nhận không khớp.')
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword, confirmPassword } = req.body
  if (!currentPassword) throw createHttpError(400, 'Vui lòng nhập mật khẩu hiện tại.')
  validateNewPassword(newPassword, confirmPassword)
  const { error } = await withAuthContext(req, res, () => neonAuth.changePassword({
    currentPassword,
    newPassword,
    revokeOtherSessions: true,
  }))
  if (error) throw createHttpError(400, error.message || 'Mật khẩu hiện tại không đúng.')
  return sendData(res, { message: 'Đổi mật khẩu thành công.' })
}

async function callEmailOtp(path, body) {
  const response = await fetch(`${process.env.NEON_AUTH_URL.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw createHttpError(response.status < 500 ? 400 : 502, result.message || 'Không thể xử lý OTP lúc này.')
  return result
}

export async function requestPasswordOtp(req, res) {
  const email = (req.auth?.email || req.body.email || '').trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) throw createHttpError(400, 'Email không hợp lệ.')
  await callEmailOtp('/forget-password/email-otp', { email })
  const expiresAt = new Date(Date.now() + 60 * 1000)
  await prisma.passwordResetOtpWindow.upsert({
    where: { email },
    create: { email, expiresAt },
    update: { expiresAt },
  })
  return sendData(res, { message: 'Mã OTP đã được gửi tới email của bạn và có hiệu lực trong 1 phút.', expiresAt })
}

export async function resetPasswordWithOtp(req, res) {
  const email = (req.auth?.email || req.body.email || '').trim().toLowerCase()
  const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : ''
  const { newPassword, confirmPassword } = req.body
  if (!/^\S+@\S+\.\S+$/.test(email)) throw createHttpError(400, 'Email không hợp lệ.')
  if (!/^\d{6}$/.test(otp)) throw createHttpError(400, 'Mã OTP phải gồm 6 chữ số.')
  validateNewPassword(newPassword, confirmPassword)
  const otpWindow = await prisma.passwordResetOtpWindow.findUnique({ where: { email } })
  if (!otpWindow || otpWindow.expiresAt <= new Date()) {
    if (otpWindow) await prisma.passwordResetOtpWindow.delete({ where: { email } })
    throw createHttpError(410, 'Mã OTP đã hết hạn. Vui lòng gửi mã mới.')
  }
  await callEmailOtp('/email-otp/reset-password', { email, otp, password: newPassword })
  await prisma.passwordResetOtpWindow.deleteMany({ where: { email } })
  return sendData(res, { message: 'Đặt lại mật khẩu thành công.' })
}
