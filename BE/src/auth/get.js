import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { neonAuth } from './client.js'
import { withAuthContext } from './context.js'
import { requireAccessSession } from './session.js'

export async function readNeonSession(req, res) {
  return withAuthContext(req, res, async () => {
    const { data, error } = await neonAuth.getSession()
    if (error || !data?.user) throw createHttpError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.')
    return data
  })
}

export async function getMe(req, res) {
  const session = await readNeonSession(req, res)
  await requireAccessSession(req, res, session.user.id)
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, username: true, displayName: true, phone: true } })
  if (!user) throw createHttpError(403, 'Tài khoản chưa được cấp quyền vào hệ thống.')
  return sendData(res, user)
}
