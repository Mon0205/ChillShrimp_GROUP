import crypto from 'node:crypto'
import { prisma } from '../../config/prisma.js'
import { neonAuth } from '../../config/neon-auth.js'
import { createHttpError } from '../../utils/http.js'
import { sendInvitationEmail } from '../notifications/email.service.js'
import { isSystemAdmin } from '../auth/account-access.service.js'
export async function listUsers({ filters = {}, membership }) {
  const members = await prisma.farmMember.findMany({
    where: { farmId: filters.farmId, ...(membership.role === 'area_manager' ? { areaId: membership.areaId } : {}) },
    select: {
      role: true,
      status: true,
      createdAt: true,
      area: { select: { id: true, code: true, name: true } },
      user: { select: { id: true, email: true, displayName: true, phone: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return members.map(({ user, ...membership }) => ({ ...user, ...membership }))
}

export async function getProfile({ actor }) {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      phone: true,
      memberships: {
        select: {
          role: true,
          status: true,
          farm: { select: { id: true, code: true, name: true } },
          area: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!user) throw createHttpError(404, 'Không tìm thấy thông tin người dùng.')
  return user
}

export async function getInvitation({ token }) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) throw createHttpError(400, 'Liên kết lời mời không hợp lệ.')
  const invitation = await prisma.farmInvitation.findUnique({
    where: { tokenHash: crypto.createHash('sha256').update(token).digest('hex') },
    select: { email: true, role: true, status: true, expiresAt: true, farm: { select: { name: true } }, area: { select: { name: true } } },
  })
  if (!invitation || invitation.status !== 'pending' || invitation.expiresAt <= new Date()) throw createHttpError(410, 'Lời mời đã hết hạn, đã được sử dụng hoặc đã bị thu hồi.')
  return { email: invitation.email, role: invitation.role, farmName: invitation.farm.name, areaName: invitation.area?.name || null, expiresAt: invitation.expiresAt }
}

export async function checkInvitationEmail({ filters = {} }) {
  const email = filters.email?.trim().toLowerCase()
  const farmId = filters.farmId
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return { available: false, code: 'INVALID_EMAIL' }
  const [user, pending] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.farmInvitation.findFirst({ where: { farmId, email, status: 'pending' } }),
  ])
  const code = user ? 'USER_EXISTS' : pending ? 'INVITATION_PENDING' : 'AVAILABLE'
  return { available: code === 'AVAILABLE', code }
}

export async function listInvitations({ filters = {}, membership }) {
  const farmId = filters.farmId
  if (!farmId) throw createHttpError(400, 'Thiếu mã trại.')
  const invitations = await prisma.farmInvitation.findMany({
    where: { farmId, status: 'pending', ...(membership.role === 'area_manager' ? { areaId: membership.areaId } : {}) },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true, area: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return invitations
}

const validEmail = (value) => typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value)

export async function createInvitation({ input = {}, membership, actor }) {
  const email = input.email?.trim().toLowerCase()
  const { farmId, role } = input
  let areaId = input.areaId || null
  const allowedRoles = ['owner', 'farm_manager', 'area_manager', 'technician', 'warehouse_staff']
  if (!validEmail(email) || !allowedRoles.includes(role)) throw createHttpError(400, 'Email hoặc chức vụ không hợp lệ.')
  if (membership.role === 'farm_manager' && role === 'owner') throw createHttpError(403, 'Quản lý trại không được cấp quyền Chủ trại.')
  if (membership.role === 'area_manager') {
    if (role !== 'technician') throw createHttpError(403, 'Quản lý khu vực chỉ được mời Nhân viên kỹ thuật trong khu vực của mình.')
    areaId = membership.areaId
  }
  if (!['owner', 'farm_manager'].includes(membership.role) && role === 'warehouse_staff') throw createHttpError(403, 'Chỉ Chủ trại hoặc Quản lý trại được mời Nhân viên kho.')
  if (['area_manager', 'technician'].includes(role) && !areaId) throw createHttpError(400, 'Chức vụ này bắt buộc phải chọn khu vực.')
  if (['owner', 'farm_manager', 'warehouse_staff'].includes(role)) areaId = null
  if (areaId) {
    const area = await prisma.area.findFirst({ where: { id: areaId, farmId, status: 'active' } })
    if (!area) throw createHttpError(400, 'Khu vực không hợp lệ, đã ngừng hoạt động hoặc không thuộc trại.')
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
    farmId, email, role, areaId, invitedBy: actor.id,
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  } })
  await sendInvitationEmail({ to: email, farmName: farm.name, token })
  return { invitationId: invitation.id }
}

export async function acceptInvitation({ input = {} }) {
  const { token, password, confirmPassword } = input
  if (typeof token !== 'string' || typeof password !== 'string' || password.length < 8) throw createHttpError(400, 'Liên kết hoặc mật khẩu không hợp lệ. Mật khẩu cần ít nhất 8 ký tự.')
  if (password !== confirmPassword) throw createHttpError(400, 'Mật khẩu xác nhận không khớp.')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const invitation = await prisma.farmInvitation.findUnique({ where: { tokenHash } })
  if (!invitation || invitation.status !== 'pending' || invitation.expiresAt <= new Date()) throw createHttpError(410, 'Lời mời đã hết hạn, đã được sử dụng hoặc đã bị thu hồi.')
  const { data, error } = await neonAuth.signUp.email({ email: invitation.email, password, name: invitation.email })
  if (error || !data?.user) throw createHttpError(409, error?.message || 'Không thể tạo tài khoản.')
  await prisma.$transaction([
    prisma.user.create({ data: { id: data.user.id, email: invitation.email, displayName: data.user.name || invitation.email } }),
    prisma.farmMember.create({ data: { farmId: invitation.farmId, userId: data.user.id, role: invitation.role, areaId: invitation.areaId } }),
    prisma.farmInvitation.update({ where: { id: invitation.id }, data: { invitedUserId: data.user.id, status: 'accepted', acceptedAt: new Date() } }),
  ])
  await neonAuth.signOut()
  return { accepted: true, email: invitation.email }
}

export async function updateProfile({ input = {}, actor }) {
  const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : ''
  const phone = typeof input.phone === 'string' ? input.phone.trim() : ''
  if (!displayName || displayName.length > 100) throw createHttpError(400, 'Họ tên phải có từ 1 đến 100 ký tự.')
  if (phone.length > 30) throw createHttpError(400, 'Số điện thoại không được vượt quá 30 ký tự.')

  const user = await prisma.user.update({
    where: { id: actor.id },
    data: { displayName, phone: phone || null },
    select: { id: true, email: true, displayName: true, phone: true },
  })
  return user
}

export async function updateMembershipStatus({ input = {}, userId, actor, membership }) {
  const farmId = input.farmId
  const status = input.status
  if (!['active', 'suspended'].includes(status)) throw createHttpError(400, 'Trạng thái thành viên không hợp lệ.')
  if (userId === actor.id) throw createHttpError(400, 'Bạn không thể ngưng sử dụng chính tài khoản của mình.')

  const target = await prisma.farmMember.findUnique({
    where: { farmId_userId: { farmId, userId: userId } },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  })
  if (!target) throw createHttpError(404, 'Không tìm thấy thành viên trong trại.')
  if (membership.role === 'area_manager') {
    const canManage = target.role === 'technician' && target.areaId === membership.areaId
    if (!canManage) throw createHttpError(403, 'Quản lý khu vực chỉ được thay đổi trạng thái Nhân viên kỹ thuật trong khu vực của mình.')
  }

  const updated = await prisma.farmMember.update({
    where: { farmId_userId: { farmId, userId: target.userId } },
    data: { status },
    select: { userId: true, status: true },
  })
  return updated
}

export async function updateManagedUser({ input = {}, userId, actor, membership }) {
  const farmId = input.farmId
  const target = await prisma.farmMember.findUnique({
    where: { farmId_userId: { farmId, userId: userId } },
    include: { user: { select: { id: true, email: true } } },
  })
  if (!target) throw createHttpError(404, 'Không tìm thấy thành viên trong trại.')

  const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : ''
  const phone = typeof input.phone === 'string' ? input.phone.trim() : ''
  const status = input.status
  if (!displayName || displayName.length > 100) throw createHttpError(400, 'Họ tên phải có từ 1 đến 100 ký tự.')
  if (phone.length > 30) throw createHttpError(400, 'Số điện thoại không được vượt quá 30 ký tự.')
  if (!['active', 'suspended'].includes(status)) throw createHttpError(400, 'Trạng thái thành viên không hợp lệ.')

  let role = target.role
  let areaId = target.areaId
  if (membership.role === 'area_manager') {
    if (target.role !== 'technician' || target.areaId !== membership.areaId) throw createHttpError(403, 'Quản lý khu vực chỉ được sửa Nhân viên kỹ thuật trong khu vực của mình.')
  } else {
    role = input.role
    if (membership.role === 'farm_manager' && role === 'owner' && target.role !== 'owner') throw createHttpError(403, 'Quản lý trại không được cấp quyền Chủ trại.')
    areaId = input.areaId || null
    if (!['owner', 'farm_manager', 'area_manager', 'technician', 'warehouse_staff'].includes(role)) throw createHttpError(400, 'Chức vụ không hợp lệ.')
    if (['area_manager', 'technician'].includes(role) && !areaId) throw createHttpError(400, 'Chức vụ này bắt buộc phải chọn khu vực.')
    if (['owner', 'farm_manager', 'warehouse_staff'].includes(role)) areaId = null
    if (areaId) {
      const area = await prisma.area.findFirst({ where: { id: areaId, farmId, status: 'active' }, select: { id: true } })
      if (!area) throw createHttpError(400, 'Khu vực không hợp lệ, đã ngừng hoạt động hoặc không thuộc trại đang quản lý.')
    }
  }

  if (target.userId === actor.id && (status !== 'active' || role !== target.role)) throw createHttpError(400, 'Bạn không thể đổi chức vụ hoặc ngưng sử dụng chính mình.')
  const [, updatedMembership] = await prisma.$transaction([
    prisma.user.update({ where: { id: target.userId }, data: { displayName, phone: phone || null } }),
    prisma.farmMember.update({ where: { farmId_userId: { farmId, userId: target.userId } }, data: { role, areaId, status }, include: { area: { select: { id: true, code: true, name: true } }, user: { select: { id: true, email: true, displayName: true, phone: true } } } }),
  ])
  return { ...updatedMembership.user, role: updatedMembership.role, status: updatedMembership.status, area: updatedMembership.area, createdAt: updatedMembership.createdAt }
}

export async function revokeInvitation({ invitationId, actor }) {
  const invitation = await prisma.farmInvitation.findUnique({ where: { id: invitationId } })
  if (!invitation || invitation.status !== 'pending') throw createHttpError(404, 'Không tìm thấy lời mời đang chờ.')
  const membership = await prisma.farmMember.findUnique({ where: { farmId_userId: { farmId: invitation.farmId, userId: actor.id } } })
  const canRevoke = isSystemAdmin(actor) || (membership?.status === 'active' && ( ['owner', 'farm_manager'].includes(membership?.role) || (membership?.role === 'area_manager' && membership.areaId === invitation.areaId)))
  if (!canRevoke) throw createHttpError(403, 'Bạn không có quyền thu hồi lời mời này.')
  await prisma.farmInvitation.update({ where: { id: invitation.id }, data: { status: 'cancelled' } })
  return undefined
}
