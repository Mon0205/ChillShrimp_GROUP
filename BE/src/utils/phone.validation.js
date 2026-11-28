import { createHttpError } from './http.js'

const PHONE_PATTERN = /^\+?[0-9 .-]+$/

// A phone number is optional. When given it has 9 to 15 digits, optionally written with a leading
// plus, spaces, dots or hyphens. Returns the trimmed number, or null when left empty.
export function normalizePhone(value) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw createHttpError(400, 'Số điện thoại phải là chuỗi ký tự.')
  const phone = value.trim()
  if (!phone) return null
  const digits = phone.replace(/[^0-9]/g, '').length
  if (!PHONE_PATTERN.test(phone) || digits < 9 || digits > 15) {
    throw createHttpError(400, 'Số điện thoại gồm 9 đến 15 chữ số, có thể có dấu + ở đầu, khoảng trắng, dấu chấm hoặc gạch ngang.')
  }
  return phone
}
