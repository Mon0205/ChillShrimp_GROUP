import { createAuthClient } from '@neondatabase/auth'
import { createHttpError } from '../utils/http.js'

// The vanilla SDK exposes the current OTP routes. In 0.5.0-beta the
// server SDK maps emailOtp.resetPassword to /email-otp/passcode instead.
async function callOtp(method, body) {
  const auth = createAuthClient(process.env.NEON_AUTH_URL, {
    fetchOptions: {
      headers: { Origin: process.env.FRONTEND_URL || 'http://localhost:5173' },
      signal: AbortSignal.timeout(15000),
      retry: 0,
    },
  })
  let result
  try { result = await method(auth, body) }
  catch (error) {
    if (typeof error.status !== 'number') throw createHttpError(502, 'Không thể kết nối dịch vụ OTP. Vui lòng thử lại.')
    result = { error }
  }
  const { data, error } = result
  if (error || !data || data.success === false || data.error) {
    const failure = error || data?.error || {}
    // The Neon vanilla adapter normalizes some provider codes; retain useful
    // Vietnamese messages when the provider describes the OTP error in text.
    const otpExpired = failure.code === 'OTP_EXPIRED' || /otp.*expired|expired.*otp/i.test(failure.message || '')
    const invalidOtp = failure.code === 'INVALID_OTP' || /invalid.*otp|otp.*invalid/i.test(failure.message || '')
    const messages = {
      INVALID_OTP: 'Mã OTP không đúng. Vui lòng kiểm tra lại.',
      OTP_EXPIRED: 'Mã OTP đã hết hạn. Vui lòng gửi mã mới.',
      TOO_MANY_ATTEMPTS: 'Bạn đã thử quá nhiều lần. Vui lòng gửi mã OTP mới.',
    }
    const status = failure.status === 429 ? 429 : otpExpired ? 410 : !error || failure.status >= 500 ? 502 : 400
    const httpError = createHttpError(status, messages[otpExpired ? 'OTP_EXPIRED' : invalidOtp ? 'INVALID_OTP' : failure.code] || (status === 429 ? 'Dịch vụ gửi OTP đang giới hạn số lượt. Vui lòng thử lại sau.' : failure.message || 'Không thể xử lý OTP lúc này.'))
    httpError.providerStatus = failure.status
    throw httpError
  }
  return data
}

export async function sendPasswordOtp(email) {
  try {
    return await callOtp((auth, body) => auth.emailOtp.requestPasswordReset(body), { email })
  } catch (error) {
    if (error.providerStatus !== 404) throw error
    return callOtp((auth, body) => auth.forgetPassword.emailOtp(body), { email })
  }
}

export function resetPasswordOtp(email, otp, password) {
  return callOtp((auth, body) => auth.emailOtp.resetPassword(body), { email, otp, password })
}
