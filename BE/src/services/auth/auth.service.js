import { alertEvents } from '../../realtime/alert-events.js'
import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'
import { neonAuth } from '../../config/neon-auth.js'
import { accountAccess } from './account-access.service.js'

const validEmail = (value) => typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value)

export async function readNeonSession({ readOnly = false } = {}) {
  // Always ask Neon so a revoked session cannot survive the SDK cookie cache.
  const { data, error } = await neonAuth.getSession({ query: { disableCookieCache: 'true', ...(readOnly ? { disableRefresh: 'true' } : {}) } })
  if (error && Number(error.status) !== 401) {
    throw createHttpError(503, 'Tạm thời không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.')
  }
  if (error || !data?.user) throw createHttpError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.')
  const createdAt = Date.parse(data.session?.createdAt)
  const neonExpiresAt = Date.parse(data.session?.expiresAt)
  const now = Date.now()
  const expiresAt = Math.min(neonExpiresAt, createdAt + 24 * 60 * 60 * 1000)
  if (!Number.isFinite(expiresAt) || createdAt > now || expiresAt <= now) {
    throw createHttpError(401, 'Phiên đăng nhập đã hết hạn.')
  }
  return { ...data, sessionExpiresAt: new Date(expiresAt) }
}

export async function getMe() {
  const session = await readNeonSession()
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, username: true, displayName: true, phone: true } })
  if (!user) throw createHttpError(403, 'Tài khoản chưa được cấp quyền vào hệ thống.')
  return { ...user, ...await accountAccess(user), sessionExpiresAt: session.sessionExpiresAt }
}

export async function login({ input = {} }) {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const password = input.password
  if (!email) throw createHttpError(400, 'Vui lòng nhập email.')
  if (!validEmail(email)) throw createHttpError(400, 'Email không hợp lệ.')
  if (typeof password !== 'string' || !password) throw createHttpError(400, 'Vui lòng nhập mật khẩu.')
  const { data, error } = await neonAuth.signIn.email({ email, password })
  if (error || !data?.user) throw createHttpError(401, 'Email hoặc mật khẩu không đúng.')
  const user = await prisma.user.findUnique({ where: { id: data.user.id }, select: { id: true, email: true, displayName: true } })
  if (!user) throw createHttpError(403, 'Tài khoản chưa được cấp quyền vào hệ thống.')
  const permissions = await accountAccess(user)
  const session = await readNeonSession()
  if (session.user.id !== user.id) throw createHttpError(401, 'Phiên đăng nhập không hợp lệ.')
  Object.assign(user, permissions)
  return { user: { ...user, sessionExpiresAt: session.sessionExpiresAt } }
}

export async function logout() {
  let session
  try { session = await readNeonSession({ readOnly: true }) } catch {}
  const { error } = await neonAuth.signOut()
  if (error) throw createHttpError(503, 'Tạm thời không thể đăng xuất. Vui lòng thử lại.')
  if (session?.session?.id) alertEvents.emit('session:ended', session.session.id)
  return { signedOut: true }
}
