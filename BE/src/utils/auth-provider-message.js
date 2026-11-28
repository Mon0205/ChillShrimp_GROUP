// Neon Auth answers in English; translate the failures a user can act on.
export function passwordProviderMessage(failure) {
  const text = `${failure?.code || ''} ${failure?.message || ''}`
  if (failure?.status === 429 || /too[ _]many/i.test(text)) return 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.'
  if (/password[ _]too[ _]long/i.test(text)) return 'Mật khẩu mới quá dài.'
  if (/password[ _]too[ _]short/i.test(text)) return 'Mật khẩu mới quá ngắn.'
  if (/invalid[ _](current[ _])?password/i.test(text)) return 'Mật khẩu hiện tại không đúng.'
  return null
}
