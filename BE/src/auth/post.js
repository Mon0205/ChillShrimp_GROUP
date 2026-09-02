import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { neonAuth } from './client.js'
import { withAuthContext } from './context.js'
import { createAccessSession, destroyAccessSession } from './session.js'

const validEmail = (value) => typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value)

export async function login(req, res) {
  const email = req.body.email?.trim().toLowerCase()
  const password = req.body.password
  if (!validEmail(email) || typeof password !== 'string' || !password) throw createHttpError(400, 'Email hoặc mật khẩu không hợp lệ.')
  const { data, error } = await withAuthContext(req, res, () => neonAuth.signIn.email({ email, password }))
  if (error || !data?.user) throw createHttpError(401, 'Email hoặc mật khẩu không đúng.')
  const user = await prisma.user.findUnique({ where: { id: data.user.id }, select: { id: true, email: true, displayName: true } })
  if (!user) throw createHttpError(403, 'Tài khoản chưa được cấp quyền vào hệ thống.')
  await createAccessSession(user.id, res)
  return sendData(res, { user })
}

export async function logout(req, res) {
  await destroyAccessSession(req, res)
  await withAuthContext(req, res, () => neonAuth.signOut())
  return sendData(res, { signedOut: true })
}
