import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'

const TANK_TYPES = ['nursery_tank', 'pond', 'other']
const TANK_STATUSES = ['empty', 'active', 'cleaning', 'inactive']
const MAX_ASSIGNED_TANKS = 5
const tankInclude = {
  area: { select: { id: true, code: true, name: true } },
  responsibleUser: { select: { id: true, displayName: true, email: true } },
}
const STATUS_TRANSITIONS = {
  empty: ['empty', 'active', 'cleaning', 'inactive'],
  active: ['active', 'cleaning', 'inactive'],
  cleaning: ['cleaning', 'empty', 'inactive'],
  inactive: ['inactive', 'empty'],
}

const normalizeCode = (value) => value?.trim().toUpperCase()
const validCode = (value) => /^[A-Z0-9][A-Z0-9_-]{1,49}$/.test(value || '')

function parseVolume(value) {
  const volume = Number(value)
  if (!Number.isFinite(volume) || volume <= 0 || volume > 1000000) {
    throw createHttpError(400, 'Thể tích ao/bể phải lớn hơn 0 và không vượt quá 1.000.000 m³.')
  }
  return new Prisma.Decimal(String(volume))
}

function validateType(value) {
  if (!TANK_TYPES.includes(value)) throw createHttpError(400, 'Loại ao/bể không hợp lệ.')
  return value
}

function ensureAreaId(context, areaId, { required = false } = {}) {
  const requestedAreaId = areaId || null
  if (context.membership.role === 'area_manager') {
    if (!context.membership.areaId) throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
    if (requestedAreaId && requestedAreaId !== context.membership.areaId) {
      throw createHttpError(403, 'Chỉ được thao tác trong khu vực được phân công.')
    }
    return context.membership.areaId
  }
  if (required && !requestedAreaId) throw createHttpError(400, 'Ao/bể phải được gán vào khu vực.')
  return requestedAreaId
}

async function assertAreaBelongsToFarm(farmId, areaId) {
  if (!areaId) return
  const area = await prisma.area.findFirst({ where: { id: areaId, farmId, status: 'active' }, select: { id: true } })
  if (!area) throw createHttpError(400, 'Khu vực không hợp lệ, đã ngừng hoạt động hoặc không thuộc trang trại đang quản lý.')
}

function requireScopedArea(context) {
  if (!['owner', 'farm_manager'].includes(context.membership.role) && !context.membership.areaId) {
    throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
  }
}

function scopedWhere(context, extra = {}) {
  requireScopedArea(context)
  return {
    farmId: context.farmId,
    ...(['owner', 'farm_manager'].includes(context.membership.role) ? {} : { areaId: context.membership.areaId }),
    ...extra,
  }
}

function serializeTank(tank) {
  return { ...tank, volumeM3: tank.volumeM3.toString() }
}

async function validateResponsibleUser(tx, farmId, areaId, userId, excludeTankId) {
  if (userId == null || (typeof userId === 'string' && !userId.trim())) return null
  if (typeof userId !== 'string') throw createHttpError(400, 'Mã nhân viên phụ trách không hợp lệ.')
  userId = userId.trim()
  if (!areaId) throw createHttpError(400, 'Chọn khu vực trước khi phân công người phụ trách.')
  // Serialize assignments across farms so concurrent requests cannot exceed five tanks.
  await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`
  const member = await tx.farmMember.findFirst({
    where: { farmId, userId, role: 'technician', status: 'active', areaId },
  })
  if (!member) throw createHttpError(400, 'Người phụ trách phải là nhân viên kỹ thuật đang hoạt động trong cùng khu vực.')
  const count = await tx.pondTank.count({
    where: { responsibleUserId: userId, deletedAt: null, ...(excludeTankId ? { id: { not: excludeTankId } } : {}) },
  })
  if (count >= MAX_ASSIGNED_TANKS) throw createHttpError(409, 'Nhân viên kỹ thuật đã phụ trách đủ 5 ao/bể. Vui lòng chọn người khác.')
  return userId
}

export async function listAvailableTechnicians(context) {
  const areaId = ensureAreaId(context, context.filters.areaId, { required: true })
  await assertAreaBelongsToFarm(context.farmId, areaId)
  const members = await prisma.farmMember.findMany({
    where: { farmId: context.farmId, areaId, role: 'technician', status: 'active' },
    select: { userId: true, user: { select: { id: true, displayName: true, email: true } } },
    orderBy: { user: { email: 'asc' } },
  })
  const loads = await prisma.pondTank.groupBy({
    by: ['responsibleUserId'],
    where: { responsibleUserId: { in: members.map(member => member.userId) }, deletedAt: null },
    _count: { _all: true },
  })
  const counts = new Map(loads.map(load => [load.responsibleUserId, load._count._all]))
  return members.map(member => ({ ...member.user, assignedTankCount: counts.get(member.userId) || 0 }))
    .filter(user => user.assignedTankCount < MAX_ASSIGNED_TANKS)
}

export async function listPondTanks(context) {
  const where = {}
  const q = context.filters.q?.trim()
  const status = context.filters.status
  const tankType = context.filters.tankType
  if (q) where.OR = [{ code: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }]
  where.deletedAt = null
  if (status) {
    if (!TANK_STATUSES.includes(status)) throw createHttpError(400, 'Trạng thái ao/bể không hợp lệ.')
    where.status = status
  }
  if (tankType) where.tankType = validateType(tankType)

  if (['owner', 'farm_manager'].includes(context.membership.role) && context.filters.areaId) {
    await assertAreaBelongsToFarm(context.farmId, context.filters.areaId)
    where.areaId = context.filters.areaId
  }

  const tanks = await prisma.pondTank.findMany({
    where: scopedWhere(context, where),
    include: tankInclude,
    orderBy: [{ status: 'asc' }, { code: 'asc' }],
  })
  return tanks.map(serializeTank)
}

export async function getPondTank(context) {
  const tank = await prisma.pondTank.findFirst({
    where: scopedWhere(context, { id: context.tankId, deletedAt: null }),
    include: tankInclude,
  })
  if (!tank) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền.')
  return serializeTank(tank)
}

export async function createPondTank(context) {
  const code = normalizeCode(context.input.code)
  const name = context.input.name?.trim()
  const tankType = validateType(context.input.tankType || 'nursery_tank')
  const areaId = ensureAreaId(context, context.input.areaId, { required: context.membership.role === 'area_manager' })

  if (!validCode(code)) throw createHttpError(400, 'Mã ao/bể phải có 2-50 ký tự hợp lệ.')
  if (!name || name.length > 100) throw createHttpError(400, 'Tên ao/bể phải từ 1 đến 100 ký tự.')
  if (typeof context.input.description === 'string' && context.input.description.length > 2000) throw createHttpError(400, 'Mô tả không được vượt quá 2.000 ký tự.')
  const volumeM3 = parseVolume(context.input.volumeM3)
  await assertAreaBelongsToFarm(context.farmId, areaId)

  try {
    const tank = await prisma.$transaction(async tx => {
      const responsibleUserId = await validateResponsibleUser(tx, context.farmId, areaId, context.input.responsibleUserId)
      return tx.pondTank.create({
        data: { farmId: context.farmId, areaId, responsibleUserId, code, name, tankType, volumeM3, description: context.input.description?.trim() || null },
        include: tankInclude,
      })
    })
    return serializeTank(tank)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã ao/bể đã tồn tại trong trang trại.')
    throw error
  }
}

export async function updatePondTank(context) {
  const existing = await prisma.pondTank.findFirst({ where: scopedWhere(context, { id: context.tankId, deletedAt: null }) })
  if (!existing) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền.')

  const data = {}
  if (context.input.status !== undefined) {
    if (!TANK_STATUSES.includes(context.input.status)) throw createHttpError(400, 'Trạng thái ao/bể không hợp lệ.')
    if (!STATUS_TRANSITIONS[existing.status]?.includes(context.input.status)) {
      throw createHttpError(409, `Không thể chuyển ao/bể từ trạng thái ${existing.status} sang ${context.input.status}.`)
    }
    data.status = context.input.status
  }
  if (typeof context.input.code === 'string') {
    const code = normalizeCode(context.input.code)
    if (!validCode(code)) throw createHttpError(400, 'Mã ao/bể phải có 2-50 ký tự hợp lệ.')
    data.code = code
  }
  if (typeof context.input.name === 'string') {
    const name = context.input.name.trim()
    if (!name || name.length > 100) throw createHttpError(400, 'Tên ao/bể phải từ 1 đến 100 ký tự.')
    data.name = name
  }
  if (typeof context.input.tankType === 'string') data.tankType = validateType(context.input.tankType)
  if (context.input.volumeM3 !== undefined) data.volumeM3 = parseVolume(context.input.volumeM3)
  if (typeof context.input.description === 'string' || context.input.description === null) {
    if (typeof context.input.description === 'string' && context.input.description.length > 2000) throw createHttpError(400, 'Mô tả không được vượt quá 2.000 ký tự.')
    data.description = context.input.description?.trim() || null
  }
  if (Object.prototype.hasOwnProperty.call(context.input, 'areaId')) {
    data.areaId = ensureAreaId(context, context.input.areaId)
    await assertAreaBelongsToFarm(context.farmId, data.areaId)
  }

  try {
    const tank = await prisma.$transaction(async tx => {
      // Lock before re-reading: a simultaneous edit may have changed area or assignee.
      await tx.$queryRaw`SELECT "id" FROM "ponds_tanks" WHERE "id" = ${existing.id}::uuid FOR UPDATE`
      const current = await tx.pondTank.findFirst({ where: scopedWhere(context, { id: existing.id, deletedAt: null }) })
      if (!current) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền.')
      if (data.status && !STATUS_TRANSITIONS[current.status]?.includes(data.status)) throw createHttpError(409, 'Không thể chuyển trạng thái ao/bể.')
      const changingAssignee = Object.prototype.hasOwnProperty.call(context.input, 'responsibleUserId')
      const changingArea = Object.prototype.hasOwnProperty.call(data, 'areaId') && data.areaId !== current.areaId
      if (changingAssignee || changingArea) {
        const userId = changingAssignee ? context.input.responsibleUserId : current.responsibleUserId
        const areaId = Object.prototype.hasOwnProperty.call(data, 'areaId') ? data.areaId : current.areaId
        data.responsibleUserId = await validateResponsibleUser(tx, context.farmId, areaId, userId, existing.id)
      }
      return tx.pondTank.update({ where: { id: existing.id }, data, include: tankInclude })
    })
    return serializeTank(tank)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã ao/bể đã tồn tại trong trang trại.')
    throw error
  }
}

export async function updatePondTankStatus(context) {
  const status = context.input.status
  if (!TANK_STATUSES.includes(status)) throw createHttpError(400, 'Trạng thái ao/bể không hợp lệ.')
  const existing = await prisma.pondTank.findFirst({ where: scopedWhere(context, { id: context.tankId, deletedAt: null }) })
  if (!existing) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền.')
  if (!STATUS_TRANSITIONS[existing.status]?.includes(status)) {
    throw createHttpError(409, `Không thể chuyển ao/bể từ trạng thái ${existing.status} sang ${status}.`)
  }

  const tank = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM ponds_tanks WHERE id = ${existing.id}::uuid FOR UPDATE`
    const current = await tx.pondTank.findFirst({ where: scopedWhere(context, { id: existing.id, deletedAt: null }) })
    if (!current) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền.')
    if (!STATUS_TRANSITIONS[current.status]?.includes(status)) {
      throw createHttpError(409, `Không thể chuyển ao/bể từ trạng thái ${current.status} sang ${status}.`)
    }
    return tx.pondTank.update({ where: { id: current.id }, data: { status }, include: tankInclude })
  })
  return serializeTank(tank)
}
