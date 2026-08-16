import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { neonAuth } from './client.js'
import { withAuthContext } from './context.js'

export async function readNeonSession(req, res) {
  return withAuthContext(req, res, async () => {
    const { data, error } = await neonAuth.getSession()
    if (error || !data?.user) throw createHttpError(401, 'Phiên Neon Auth không hợp lệ hoặc đã hết hạn.')
    return data
  })
}

export async function getMe(req, res) {
  const session = await readNeonSession(req, res)
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, username: true, displayName: true, phone: true } })
  if (!user) throw createHttpError(403, 'Tài khoản chưa được cấp quyền vào hệ thống.')
  return sendData(res, user)
}

export async function checkInvitationEmail(req, res) {
  const email = req.query.email?.trim().toLowerCase()
  const farmId = req.query.farmId
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return sendData(res, { available: false, code: 'INVALID_EMAIL' })
  const [user, pending] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.farmInvitation.findFirst({ where: { farmId, email, status: 'pending' } }),
  ])
  const code = user ? 'USER_EXISTS' : pending ? 'INVITATION_PENDING' : 'AVAILABLE'
  return sendData(res, { available: code === 'AVAILABLE', code })
}

export async function listInvitations(req, res) {
  const farmId = req.query.farmId
  if (!farmId) throw createHttpError(400, 'Thiếu mã trại.')
  const invitations = await prisma.farmInvitation.findMany({ where: { farmId, status: 'pending' }, select: { id: true, email: true, role: true, expiresAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } })
  return sendData(res, invitations)
}
