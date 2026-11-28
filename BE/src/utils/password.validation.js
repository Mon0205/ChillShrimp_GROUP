export const PASSWORD_RULE_MESSAGE = 'Mật khẩu cần ít nhất 8 ký tự, gồm cả chữ và số.'

export function isAcceptablePassword(password) {
  return typeof password === 'string' && password.length >= 8 && /\p{L}/u.test(password) && /[0-9]/.test(password)
}
