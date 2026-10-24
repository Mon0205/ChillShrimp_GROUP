import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { neonAuth } from './client.js'
import { withAuthContext } from './context.js'
import { readNeonSession } from './get.js'
import { accountAccess } from './access.js'

const validEmail = (value) => typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value)

export async function login(req, res) {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = req.body.password
  if (!email) throw createHttpError(400, 'Vui lòng nhập email.')
  if (!validEmail(email)) throw createHttpError(400, 'Email không hợp lệ.')
  if (typeof password !== 'string' || !password) throw createHttpError(400, 'Vui lòng nhập mật khẩu.')
  const { data, error } = await withAuthContext(req, res, () => neonAuth.signIn.email({ email, password }))
  if (error || !data?.user) throw createHttpError(401, 'Email hoặc mật khẩu không đúng.')
  const user = await prisma.user.findUnique({ where: { id: data.user.id }, select: { id: true, email: true, displayName: true } })
  if (!user) throw createHttpError(403, 'Tài khoản chưa được cấp quyền vào hệ thống.')
  const permissions = await accountAccess(user)
  const session = await readNeonSession(req, res)
  if (session.user.id !== user.id) throw createHttpError(401, 'Phiên đăng nhập không hợp lệ.')
  Object.assign(user, permissions)
  return sendData(res, { user: { ...user, sessionExpiresAt: session.sessionExpiresAt } })
}

export async function logout(req, res) {
  const { error } = await withAuthContext(req, res, () => neonAuth.signOut())
  if (error) throw createHttpError(503, 'Tạm thời không thể đăng xuất. Vui lòng thử lại.')
  return sendData(res, { signedOut: true })
}
