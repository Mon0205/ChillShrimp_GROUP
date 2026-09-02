import crypto from 'node:crypto'
import { prisma } from '../config/prisma.js'
import { sendInvitationEmail } from '../services/email.service.js'
import { createHttpError, sendData } from '../utils/http.js'
import { neonAuth } from '../auth/client.js'
import { withAuthContext } from '../auth/context.js'

const validEmail = (value) => typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value)

export async function createInvitation(req, res) {
  const email = req.body.email?.trim().toLowerCase()
  const { farmId, role } = req.body
  let areaId = req.body.areaId || null
  const allowedRoles = ['owner', 'area_manager', 'technician', 'warehouse_staff']
  if (!validEmail(email) || !allowedRoles.includes(role)) throw createHttpError(400, 'Email hoặc chức vụ không hợp lệ.')
  if (req.membership.role === 'area_manager') {
    if (role !== 'technician') throw createHttpError(403, 'Quản lý khu vực chỉ được mời Nhân viên kỹ thuật trong khu vực của mình.')
    areaId = req.membership.areaId
  }
  if (req.membership.role !== 'owner' && role === 'warehouse_staff') throw createHttpError(403, 'Chỉ Owner được mời Warehouse Staff.')
  if (['area_manager', 'technician'].includes(role) && !areaId) throw createHttpError(400, 'Chức vụ này bắt buộc phải chọn khu vực.')
  if (['owner', 'warehouse_staff'].includes(role)) areaId = null
  if (areaId) {
    const area = await prisma.area.findFirst({ where: { id: areaId, farmId } })
    if (!area) throw createHttpError(400, 'Khu vực không hợp lệ hoặc không thuộc trại.')
  }
  const [user, pending, farm] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.farmInvitation.findFirst({ where: { farmId, email, status: 'pending' } }),
    prisma.farm.findUnique({ where: { id: farmId } }),
  ])
  if (!farm) throw createHttpError(404, 'Không tìm thấy trại.')
  if (user) throw createHttpError(409, 'Email này đã có tài khoản trong hệ thống.')
  if (pending) throw createHttpError(409, 'Email này đã có lời mời đang chờ.')
  const token = crypto.randomBytes(32).toString('hex')
  const invitation = await prisma.farmInvitation.create({ data: {
    farmId, email, role, areaId, invitedBy: req.auth.id,
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  } })
  await sendInvitationEmail({ to: email, farmName: farm.name, token })
  return sendData(res, { invitationId: invitation.id }, 201)
}

export async function acceptInvitation(req, res) {
  const { token, password, confirmPassword } = req.body
  if (typeof token !== 'string' || typeof password !== 'string' || password.length < 8) throw createHttpError(400, 'Liên kết hoặc mật khẩu không hợp lệ. Mật khẩu cần ít nhất 8 ký tự.')
  if (password !== confirmPassword) throw createHttpError(400, 'Mật khẩu xác nhận không khớp.')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const invitation = await prisma.farmInvitation.findUnique({ where: { tokenHash } })
  if (!invitation || invitation.status !== 'pending' || invitation.expiresAt <= new Date()) throw createHttpError(410, 'Lời mời đã hết hạn, đã được sử dụng hoặc đã bị thu hồi.')
  const { data, error } = await withAuthContext(req, res, () => neonAuth.signUp.email({ email: invitation.email, password, name: invitation.email }))
  if (error || !data?.user) throw createHttpError(409, error?.message || 'Không thể tạo tài khoản.')
  await prisma.$transaction([
    prisma.user.create({ data: { id: data.user.id, email: invitation.email, displayName: data.user.name || invitation.email } }),
    prisma.farmMember.create({ data: { farmId: invitation.farmId, userId: data.user.id, role: invitation.role, areaId: invitation.areaId } }),
    prisma.farmInvitation.update({ where: { id: invitation.id }, data: { invitedUserId: data.user.id, status: 'accepted', acceptedAt: new Date() } }),
  ])
  await withAuthContext(req, res, () => neonAuth.signOut())
  return sendData(res, { accepted: true, email: invitation.email })
}
