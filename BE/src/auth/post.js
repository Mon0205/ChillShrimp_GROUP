import crypto from 'node:crypto'
import { prisma } from '../config/prisma.js'
import { sendInvitationEmail } from '../services/email.service.js'
import { createHttpError, sendData } from '../utils/http.js'
import { neonAuth } from './client.js'
import { withAuthContext } from './context.js'

const validEmail = (value) => typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value)

export async function login(req, res) {
  const email = req.body.email?.trim().toLowerCase()
  const password = req.body.password
  if (!validEmail(email) || typeof password !== 'string') throw createHttpError(400, 'Email hoặc mật khẩu không hợp lệ.')
  const { data, error } = await withAuthContext(req, res, () => neonAuth.signIn.email({ email, password }))
  if (error || !data?.user) throw createHttpError(401, error?.message || 'Email hoặc mật khẩu không đúng.')
  const user = await prisma.user.findUnique({ where: { id: data.user.id }, select: { id: true, email: true, displayName: true } })
  if (!user) throw createHttpError(403, 'Tài khoản chưa được cấp quyền vào hệ thống.')
  return sendData(res, { user })
}

export async function logout(req, res) {
  await withAuthContext(req, res, () => neonAuth.signOut())
  return sendData(res, { signedOut: true })
}

export async function createInvitation(req, res) {
  const email = req.body.email?.trim().toLowerCase()
  const { farmId, role } = req.body
  if (!validEmail(email) || !['manager', 'staff', 'viewer'].includes(role)) throw createHttpError(400, 'Dữ liệu lời mời không hợp lệ.')
  const [user, pending, farm] = await Promise.all([prisma.user.findUnique({ where: { email } }), prisma.farmInvitation.findFirst({ where: { farmId, email, status: 'pending' } }), prisma.farm.findUnique({ where: { id: farmId } })])
  if (!farm) throw createHttpError(404, 'Không tìm thấy trại.')
  if (user) throw createHttpError(409, 'Email này đã tồn tại trong hệ thống.')
  if (pending) throw createHttpError(409, 'Email này đã có lời mời đang chờ.')
  const token = crypto.randomBytes(32).toString('hex')
  const invitation = await prisma.farmInvitation.create({ data: { farmId, email, role, invitedBy: req.auth.id, tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } })
  await sendInvitationEmail({ to: email, farmName: farm.name, token })
  return sendData(res, { invitationId: invitation.id }, 201)
}

export async function acceptInvitation(req, res) {
  const { token, password } = req.body
  if (typeof token !== 'string' || typeof password !== 'string' || password.length < 8) throw createHttpError(400, 'Token hoặc mật khẩu không hợp lệ.')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const invitation = await prisma.farmInvitation.findUnique({ where: { tokenHash } })
  if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) throw createHttpError(400, 'Lời mời đã hết hạn hoặc bị thu hồi.')
  const { data, error } = await withAuthContext(req, res, () => neonAuth.signUp.email({ email: invitation.email, password, name: invitation.email }))
  if (error || !data?.user) throw createHttpError(409, error?.message || 'Không thể tạo tài khoản Neon Auth.')
  await prisma.$transaction([
    prisma.user.create({ data: { id: data.user.id, email: invitation.email, displayName: data.user.name || invitation.email } }),
    prisma.farmMember.create({ data: { farmId: invitation.farmId, userId: data.user.id, role: invitation.role } }),
    prisma.farmInvitation.update({ where: { id: invitation.id }, data: { invitedUserId: data.user.id, status: 'accepted', acceptedAt: new Date() } }),
  ])
  return sendData(res, { accepted: true })
}
