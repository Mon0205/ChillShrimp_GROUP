import { prisma } from '../config/prisma.js'
import { createHttpError } from '../utils/http.js'
import { readNeonSession } from '../auth/get.js'
import { requireAccessSession } from '../auth/session.js'
import { accountAccess } from '../auth/access.js'

export async function requireAuth(req, res, next) {
  try {
    const session = await readNeonSession(req, res)
    await requireAccessSession(req, res, session.user.id)
    await accountAccess(session.user)
    req.auth = { id: session.user.id, email: session.user.email }
    next()
  } catch (error) { next(error) }
}

async function loadMembership(req, { allowArchivedFarm = false } = {}) {
  const ids = [req.params?.farmId, req.query?.farmId, req.body?.farmId].filter(value => value !== undefined)
  if (ids.some(value => typeof value !== 'string') || new Set(ids).size > 1) throw createHttpError(400, 'Mã trại không hợp lệ hoặc không nhất quán.')
  const farmId = ids[0]
  if (!farmId) throw createHttpError(400, 'Thiếu mã trại.')
  const membership = await prisma.farmMember.findUnique({
    where: { farmId_userId: { farmId, userId: req.auth.id } },
    include: { farm: { select: { status: true } } },
  })
  if (!membership) throw createHttpError(403, 'Bạn không thuộc trại này.')
  if (membership.status === 'suspended') throw createHttpError(403, 'Tài khoản của bạn đã bị ngưng sử dụng tại trại này.')
  if (!allowArchivedFarm && membership.farm.status === 'archived') {
    throw createHttpError(409, 'Trang trại đã được lưu trữ. Hãy khôi phục trang trại trước khi tiếp tục.')
  }
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

export async function requireSeedSupplierViewer(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'area_manager'].includes(membership.role)) {
      throw createHttpError(403, 'Chá»‰ Owner hoáº·c Quáº£n lÃ½ khu vá»±c Ä‘Æ°á»£c xem nhÃ  cung cáº¥p giá»‘ng.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireSeedSupplierManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (membership.role !== 'owner') {
      throw createHttpError(403, 'Chá»‰ Owner má»›i Ä‘Æ°á»£c quáº£n lÃ½ nhÃ  cung cáº¥p giá»‘ng.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireSeedBatchViewer(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'area_manager', 'technician'].includes(membership.role)) {
      throw createHttpError(403, 'Chức vụ hiện tại không có quyền xem lô giống.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireSeedBatchManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'area_manager'].includes(membership.role)) {
      throw createHttpError(403, 'Chỉ Owner hoặc Quản lý khu vực được tiếp nhận lô giống.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireFeedingAccess(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'area_manager', 'technician'].includes(membership.role)) {
      throw createHttpError(403, 'Chức vụ hiện tại không có quyền ghi hoặc xem nhật ký cho ăn.')
    }
    req.membership = membership
    next()
  } catch (error) {
    next(error)
  }
}

export async function requireCareLogAccess(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'area_manager', 'technician'].includes(membership.role)) {
      throw createHttpError(403, 'Chá»©c vá»¥ hiá»‡n táº¡i khÃ´ng cÃ³ quyá»n ghi hoáº·c xem nháº­t kÃ½ chÄƒm sÃ³c ao/bá»ƒ.')
    }
    req.membership = membership
    next()
  } catch (error) {
    next(error)
  }
}

export async function requireEnvironmentThresholdViewer(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'area_manager', 'technician'].includes(membership.role)) {
      throw createHttpError(403, 'Your farm role cannot view environmental thresholds or alerts.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireEnvironmentThresholdManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (membership.role !== 'owner') throw createHttpError(403, 'Only the farm owner can configure or approve farm-wide thresholds.')
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireInventorySupplyViewer(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'warehouse_staff', 'area_manager', 'technician'].includes(membership.role)) {
      throw createHttpError(403, 'Chức vụ hiện tại không có quyền xem danh mục vật tư.')
    }
    req.membership = membership
    next()
  } catch (error) {
    next(error)
  }
}

export async function requireInventorySupplyManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'warehouse_staff'].includes(membership.role)) {
      throw createHttpError(403, 'Chỉ Owner hoặc Nhân viên kho mới được quản lý danh mục vật tư.')
    }
    req.membership = membership
    next()
  } catch (error) {
    next(error)
  }
}

export async function requireInventoryUsageAccess(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'technician'].includes(membership.role)) {
      throw createHttpError(403, 'Chỉ Owner hoặc Technician được ghi/xem sử dụng vật tư theo UC07.5.')
    }
    req.membership = membership
    next()
  } catch (error) {
    next(error)
  }
}

export async function requireInventoryRequestAccess(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'area_manager', 'warehouse_staff'].includes(membership.role)) {
      throw createHttpError(403, 'Chá»©c vá»¥ hiá»‡n táº¡i khÃ´ng cÃ³ quyá»n xem yÃªu cáº§u cáº¥p váº­t tÆ°.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireInventoryRequestCreator(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'area_manager'].includes(membership.role)) {
      throw createHttpError(403, 'Chá»‰ Owner hoáº·c Area Manager Ä‘Æ°á»£c gá»­i yÃªu cáº§u cáº¥p váº­t tÆ°.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireInventoryAdjustmentManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['owner', 'warehouse_staff'].includes(membership.role)) {
      throw createHttpError(403, 'Chá»‰ Owner hoáº·c Warehouse Staff Ä‘Æ°á»£c Ä‘iá»u chá»‰nh tá»“n kho.')
    }
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

export async function requireFarmOwnerIncludingArchived(req, _res, next) {
  try {
    const membership = await loadMembership(req, { allowArchivedFarm: true })
    if (membership.role !== 'owner') throw createHttpError(403, 'Chỉ Owner mới có quyền thực hiện thao tác này.')
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireOwnerAccount(req, _res, next) {
  try {
    const { canCreateFarm } = await accountAccess(req.auth)
    if (!canCreateFarm) throw createHttpError(403, 'Chỉ Owner mới được tạo trại.')
    next()
  } catch (error) { next(error) }
}
