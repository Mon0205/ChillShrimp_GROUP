import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

export async function updateProfile(req, res) {
  const displayName = typeof req.body.displayName === 'string' ? req.body.displayName.trim() : ''
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : ''
  if (!displayName || displayName.length > 100) throw createHttpError(400, 'Họ tên phải có từ 1 đến 100 ký tự.')
  if (phone.length > 30) throw createHttpError(400, 'Số điện thoại không được vượt quá 30 ký tự.')

  const user = await prisma.user.update({
    where: { id: req.auth.id },
    data: { displayName, phone: phone || null },
    select: { id: true, email: true, displayName: true, phone: true },
  })
  return sendData(res, user)
}

export async function updateMembershipStatus(req, res) {
  const farmId = req.body.farmId
  const status = req.body.status
  if (!['active', 'suspended'].includes(status)) throw createHttpError(400, 'Trạng thái thành viên không hợp lệ.')
  if (req.params.userId === req.auth.id) throw createHttpError(400, 'Bạn không thể ngưng sử dụng chính tài khoản của mình.')

  const target = await prisma.farmMember.findUnique({
    where: { farmId_userId: { farmId, userId: req.params.userId } },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  })
  if (!target) throw createHttpError(404, 'Không tìm thấy thành viên trong trại.')
  if (req.membership.role === 'area_manager') {
    const canManage = target.role === 'technician' && target.areaId === req.membership.areaId
    if (!canManage) throw createHttpError(403, 'Quản lý khu vực chỉ được thay đổi trạng thái Nhân viên kỹ thuật trong khu vực của mình.')
  }

  const updated = await prisma.farmMember.update({
    where: { farmId_userId: { farmId, userId: target.userId } },
    data: { status },
    select: { userId: true, status: true },
  })
  return sendData(res, updated)
}

export async function updateManagedUser(req, res) {
  const farmId = req.body.farmId
  const target = await prisma.farmMember.findUnique({
    where: { farmId_userId: { farmId, userId: req.params.userId } },
    include: { user: { select: { id: true, email: true } } },
  })
  if (!target) throw createHttpError(404, 'Không tìm thấy thành viên trong trại.')

  const displayName = typeof req.body.displayName === 'string' ? req.body.displayName.trim() : ''
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : ''
  const status = req.body.status
  if (!displayName || displayName.length > 100) throw createHttpError(400, 'Họ tên phải có từ 1 đến 100 ký tự.')
  if (phone.length > 30) throw createHttpError(400, 'Số điện thoại không được vượt quá 30 ký tự.')
  if (!['active', 'suspended'].includes(status)) throw createHttpError(400, 'Trạng thái thành viên không hợp lệ.')

  let role = target.role
  let areaId = target.areaId
  if (req.membership.role === 'area_manager') {
    if (target.role !== 'technician' || target.areaId !== req.membership.areaId) throw createHttpError(403, 'Quản lý khu vực chỉ được sửa Nhân viên kỹ thuật trong khu vực của mình.')
  } else {
    role = req.body.role
    areaId = req.body.areaId || null
    if (!['owner', 'area_manager', 'technician', 'warehouse_staff'].includes(role)) throw createHttpError(400, 'Chức vụ không hợp lệ.')
    if (['area_manager', 'technician'].includes(role) && !areaId) throw createHttpError(400, 'Chức vụ này bắt buộc phải chọn khu vực.')
    if (['owner', 'warehouse_staff'].includes(role)) areaId = null
    if (areaId) {
      const area = await prisma.area.findFirst({ where: { id: areaId, farmId }, select: { id: true } })
      if (!area) throw createHttpError(400, 'Khu vực không thuộc trại đang quản lý.')
    }
  }

  if (target.userId === req.auth.id && (status !== 'active' || role !== target.role)) throw createHttpError(400, 'Bạn không thể đổi chức vụ hoặc ngưng sử dụng chính mình.')
  const [, membership] = await prisma.$transaction([
    prisma.user.update({ where: { id: target.userId }, data: { displayName, phone: phone || null } }),
    prisma.farmMember.update({ where: { farmId_userId: { farmId, userId: target.userId } }, data: { role, areaId, status }, include: { area: { select: { id: true, code: true, name: true } }, user: { select: { id: true, email: true, displayName: true, phone: true } } } }),
  ])
  return sendData(res, { ...membership.user, role: membership.role, status: membership.status, area: membership.area, createdAt: membership.createdAt })
}
