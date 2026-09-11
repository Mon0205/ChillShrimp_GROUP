import { prisma } from '../config/prisma.js'
import { createHttpError } from '../utils/http.js'
import { readNeonSession } from '../auth/get.js'
import { requireAccessSession } from '../auth/session.js'

export async function requireAuth(req, res, next) {
  try {
    const session = await readNeonSession(req, res)
    await requireAccessSession(req, res, session.user.id)
    req.auth = { id: session.user.id, email: session.user.email }
    next()
  } catch (error) { next(error) }
}

async function loadMembership(req) {
  const farmId = req.params.farmId || req.query.farmId || req.body.farmId
  if (!farmId) throw createHttpError(400, 'Thiếu mã trại.')
  const membership = await prisma.farmMember.findUnique({ where: { farmId_userId: { farmId, userId: req.auth.id } } })
  if (!membership) throw createHttpError(403, 'Bạn không thuộc trại này.')
  if (membership.status === 'suspended') throw createHttpError(403, 'Tài khoản của bạn đã bị ngưng sử dụng tại trại này.')
  return membership
}

export async function requireFarmMember(req, _res, next) {
  try {
    req.membership = await loadMembership(req)
    next()
  } catch (error) { next(error) }
}

export async function requirePondTankViewer(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'area_manager', 'technician'].includes(membership.role)) {
      throw createHttpError(403, 'Chức vụ hiện tại không có quyền xem ao/bể.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requirePondTankManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'area_manager'].includes(membership.role)) {
      throw createHttpError(403, 'Chỉ Owner hoặc Quản lý khu vực mới có quyền quản lý ao/bể.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireFarmManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'area_manager'].includes(membership.role)) throw createHttpError(403, 'Bạn không có quyền quản lý người dùng của trại này.')
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireFarmOwner(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (membership.role !== 'owner') throw createHttpError(403, 'Chỉ Owner mới có quyền thực hiện thao tác này.')
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireOwnerAccount(req, _res, next) {
  try {
    const bootstrapOwner = req.auth.email?.toLowerCase() === process.env.ADMIN_EMAIL?.trim().toLowerCase()
    const ownerMembership = await prisma.farmMember.findFirst({ where: { userId: req.auth.id, role: 'owner', status: 'active' }, select: { userId: true } })
    if (!bootstrapOwner && !ownerMembership) throw createHttpError(403, 'Chỉ Owner mới được tạo trại.')
    next()
  } catch (error) { next(error) }
}
