import crypto from 'node:crypto'
import { prisma } from '../config/prisma.js'
import { sendInvitationEmail } from '../services/email.service.js'
import { createHttpError, sendData } from '../utils/http.js'

const validEmail = (value) => typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value)

export async function checkEmail(req, res) {
  const email = req.query.email?.trim().toLowerCase()
  const farmId = req.query.farmId
  if (!validEmail(email)) return sendData(res, { available: false, code: 'INVALID_EMAIL' })
  const [user, pending] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.farmInvitation.findFirst({ where: { farmId, email, status: 'pending' } }),
  ])
  const code = user ? 'USER_EXISTS' : pending ? 'INVITATION_PENDING' : 'AVAILABLE'
  return sendData(res, { available: code === 'AVAILABLE', code })
}

export async function createInvitation(req, res) {
  const email = req.body.email?.trim().toLowerCase()
  const { farmId, role } = req.body
  if (!validEmail(email) || !['manager', 'staff', 'viewer'].includes(role)) throw createHttpError(400, 'Dữ liệu lời mời không hợp lệ.')
  const [user, pending, farm] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.farmInvitation.findFirst({ where: { farmId, email, status: 'pending' } }),
    prisma.farm.findUnique({ where: { id: farmId } }),
  ])
  if (!farm) throw createHttpError(404, 'Không tìm thấy trại.')
  if (user) throw createHttpError(409, 'Email này đã tồn tại trong hệ thống.')
  if (pending) throw createHttpError(409, 'Email này đã có lời mời đang chờ.')
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const invitation = await prisma.$transaction(async (tx) => {
    const invitedUser = await tx.user.create({ data: { email, displayName: email } })
    await tx.farmMember.create({ data: { farmId, userId: invitedUser.id, role } })
    return tx.farmInvitation.create({ data: { farmId, invitedUserId: invitedUser.id, email, role, invitedBy: req.auth.id, tokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } })
  })
  await sendInvitationEmail({ to: email, farmName: farm.name, token })
  return sendData(res, { invitationId: invitation.id }, 201)
}
