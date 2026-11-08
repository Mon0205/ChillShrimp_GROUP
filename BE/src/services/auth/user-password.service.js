import { sendPasswordOtp, resetPasswordOtp } from './password-otp.service.js'
import { neonAuth } from '../../config/neon-auth.js'
import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'

function validateNewPassword(password, confirmPassword) {
  if (typeof password !== 'string' || password.length < 8) throw createHttpError(400, 'Mật khẩu mới cần ít nhất 8 ký tự.')
  if (password !== confirmPassword) throw createHttpError(400, 'Mật khẩu xác nhận không khớp.')
}

export async function changePassword({ input = {} }) {
  const { currentPassword, newPassword, confirmPassword } = input
  if (!currentPassword) throw createHttpError(400, 'Vui lòng nhập mật khẩu hiện tại.')
  validateNewPassword(newPassword, confirmPassword)
  const { error } = await neonAuth.changePassword({
    currentPassword,
    newPassword,
    revokeOtherSessions: true,
  })
  if (error) throw createHttpError(400, error.message || 'Mật khẩu hiện tại không đúng.')
  return { message: 'Đổi mật khẩu thành công.' }
}

export async function requestPasswordOtp({ actor, input = {} }) {
  const rawEmail = actor?.email || input?.email
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
  if (!/^\S+@\S+\.\S+$/.test(email)) throw createHttpError(400, 'Email không hợp lệ.')
  await sendPasswordOtp(email)
  const expiresAt = new Date(Date.now() + 60 * 1000)
  await prisma.passwordResetOtpWindow.upsert({
    where: { email },
    create: { email, expiresAt },
    update: { expiresAt },
  })
  return { message: 'Mã OTP đã được gửi tới email của bạn và có hiệu lực trong 1 phút.', expiresAt }
}

export async function resetPasswordWithOtp({ actor, input = {} }) {
  const rawEmail = actor?.email || input?.email
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
  const otp = typeof input.otp === 'string' ? input.otp.trim() : ''
  const { newPassword, confirmPassword } = input
  if (!/^\S+@\S+\.\S+$/.test(email)) throw createHttpError(400, 'Email không hợp lệ.')
  if (!/^\d{6}$/.test(otp)) throw createHttpError(400, 'Mã OTP phải gồm 6 chữ số.')
  validateNewPassword(newPassword, confirmPassword)
  const otpWindow = await prisma.passwordResetOtpWindow.findUnique({ where: { email } })
  if (!otpWindow) throw createHttpError(400, 'Mã OTP không hợp lệ hoặc đã được sử dụng. Vui lòng gửi mã mới.')
  if (otpWindow.expiresAt <= new Date()) {
    throw createHttpError(410, 'Mã OTP đã hết hạn. Vui lòng gửi mã mới.')
  }
  await resetPasswordOtp(email, otp, newPassword)
  await prisma.passwordResetOtpWindow.deleteMany({ where: { email, expiresAt: otpWindow.expiresAt } })
  return { message: 'Đặt lại mật khẩu thành công.' }
}
