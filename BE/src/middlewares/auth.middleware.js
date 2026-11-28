import { withAuthContext } from './auth-context.js'
import * as membershipService from '../services/users/membership.service.js'
import { createHttpError } from '../utils/http.js'
import { readNeonSession } from '../services/auth/auth.service.js'
import { accountAccess } from '../services/auth/account-access.service.js'

export async function requireAuth(req, res, next) {
  try {
    const session = await withAuthContext(req, res, () => readNeonSession())
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
  return membershipService.loadMembership({ farmId, actor: req.auth, allowArchivedFarm })
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
    if (!['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(membership.role)) {
      throw createHttpError(403, 'Chức vụ hiện tại không có quyền xem ao/bể.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requirePondTankManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['OWNER', 'FARM_MANAGER', 'AREA_MANAGER'].includes(membership.role)) {
      throw createHttpError(403, 'Chỉ Chủ trại, Quản lý trại hoặc Quản lý khu vực mới có quyền quản lý ao/bể.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireFarmManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['OWNER', 'FARM_MANAGER', 'AREA_MANAGER'].includes(membership.role)) throw createHttpError(403, 'Bạn không có quyền quản lý người dùng của trại này.')
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireSeedSupplierViewer(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['OWNER', 'FARM_MANAGER', 'AREA_MANAGER'].includes(membership.role)) {
      throw createHttpError(403, 'Chỉ Chủ trại, Quản lý trại hoặc Quản lý khu vực được xem nhà cung cấp giống.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireSeedSupplierManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['OWNER', 'FARM_MANAGER'].includes(membership.role)) {
      throw createHttpError(403, 'Chỉ Chủ trại hoặc Quản lý trại được quản lý nhà cung cấp giống.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireSeedBatchViewer(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(membership.role)) {
      throw createHttpError(403, 'Chức vụ hiện tại không có quyền xem lô giống.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireSeedBatchManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['OWNER', 'FARM_MANAGER', 'AREA_MANAGER'].includes(membership.role)) {
      throw createHttpError(403, 'Chỉ Chủ trại, Quản lý trại hoặc Quản lý khu vực được tiếp nhận lô giống.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireFeedingAccess(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(membership.role)) {
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
    if (!['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(membership.role)) {
      throw createHttpError(403, 'Chức vụ hiện tại không có quyền ghi hoặc xem nhật ký chăm sóc ao/bể.')
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
    if (!['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(membership.role)) {
      throw createHttpError(403, 'Chức vụ hiện tại không có quyền xem ngưỡng môi trường hoặc cảnh báo.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireEnvironmentThresholdManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['OWNER', 'FARM_MANAGER'].includes(membership.role)) throw createHttpError(403, 'Chỉ Chủ trại hoặc Quản lý trại được cấu hình và duyệt ngưỡng của trại.')
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireInventorySupplyViewer(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['OWNER', 'FARM_MANAGER', 'WAREHOUSE_STAFF', 'AREA_MANAGER', 'TECHNICIAN'].includes(membership.role)) {
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
    if (!['OWNER', 'FARM_MANAGER', 'WAREHOUSE_STAFF'].includes(membership.role)) {
      throw createHttpError(403, 'Chỉ Chủ trại, Quản lý trại hoặc Nhân viên kho được quản lý danh mục vật tư.')
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
    if (!['OWNER', 'FARM_MANAGER', 'WAREHOUSE_STAFF', 'AREA_MANAGER', 'TECHNICIAN'].includes(membership.role)) {
      throw createHttpError(403, 'Vai trò hiện tại không có quyền xem lịch sử cấp vật tư.')
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
    if (!['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'WAREHOUSE_STAFF'].includes(membership.role)) {
      throw createHttpError(403, 'Chức vụ hiện tại không có quyền xem yêu cầu cấp vật tư.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireInventoryRequestCreator(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (membership.role !== 'AREA_MANAGER') throw createHttpError(403, 'Chỉ quản lý khu vực được tạo yêu cầu cấp vật tư.')
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireInventoryAdjustmentManager(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['OWNER', 'FARM_MANAGER', 'WAREHOUSE_STAFF'].includes(membership.role)) {
      throw createHttpError(403, 'Chỉ Chủ trại, Quản lý trại hoặc Nhân viên kho được điều chỉnh tồn kho.')
    }
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireFarmOwner(req, _res, next) {
  try {
    const membership = await loadMembership(req)
    if (!['OWNER', 'FARM_MANAGER'].includes(membership.role)) throw createHttpError(403, 'Chỉ Chủ trại hoặc Quản lý trại có quyền thực hiện thao tác này.')
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireFarmOwnerIncludingArchived(req, _res, next) {
  try {
    const membership = await loadMembership(req, { allowArchivedFarm: true })
    if (!['OWNER', 'FARM_MANAGER'].includes(membership.role)) throw createHttpError(403, 'Chỉ Chủ trại hoặc Quản lý trại có quyền thực hiện thao tác này.')
    req.membership = membership
    next()
  } catch (error) { next(error) }
}

export async function requireOwnerAccount(req, _res, next) {
  try {
    const { canCreateFarm } = await accountAccess(req.auth)
    if (!canCreateFarm) throw createHttpError(403, 'Chỉ Chủ trại mới được tạo trại.')
    next()
  } catch (error) { next(error) }
}
