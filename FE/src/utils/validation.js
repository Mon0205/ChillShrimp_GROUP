// Business constraints supplied to Vuetify's built-in form validation.
export const required = (label) => value => (typeof value === 'string' ? !!value.trim() : !!value) || `Vui lòng nhập ${label}.`
export const emailRule = value => /^\S+@\S+\.\S+$/.test(String(value || '').trim()) || 'Email không hợp lệ.'
export const passwordRule = value => (typeof value === 'string' && value.length >= 8) || 'Mật khẩu cần ít nhất 8 ký tự.'
export const matchingPassword = password => value => value === password() || 'Mật khẩu xác nhận không khớp.'
export const otpRule = value => /^\d{6}$/.test(String(value || '')) || 'Mã OTP phải gồm 6 chữ số.'
export const codeRule = value => /^[A-Z0-9][A-Z0-9_-]{1,29}$/.test(String(value || '').trim().toUpperCase()) || 'Mã cần 2–30 ký tự: chữ, số, gạch ngang hoặc gạch dưới.'
export const maxLength = length => value => String(value || '').length <= length || `Tối đa ${length} ký tự.`
