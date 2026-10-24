import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { neonAuth } from './client.js'
import { withAuthContext } from './context.js'
import { accountAccess } from './access.js'

export async function readNeonSession(req, res) {
  return withAuthContext(req, res, async () => {
    // Always ask Neon so a revoked session cannot survive the SDK cookie cache.
    const { data, error } = await neonAuth.getSession({ query: { disableCookieCache: 'true' } })
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
  })
}

export async function getMe(req, res) {
  const session = await readNeonSession(req, res)
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, username: true, displayName: true, phone: true } })
  if (!user) throw createHttpError(403, 'Tài khoản chưa được cấp quyền vào hệ thống.')
  return sendData(res, { ...user, ...await accountAccess(user), sessionExpiresAt: session.sessionExpiresAt })
}
