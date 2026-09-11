import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

const TANK_TYPES = ['nursery_tank', 'pond', 'other']
const TANK_STATUSES = ['empty', 'active', 'cleaning', 'inactive']
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

function ensureAreaId(req, areaId, { required = false } = {}) {
  const requestedAreaId = areaId || null
  if (req.membership.role === 'area_manager') {
    if (!req.membership.areaId) throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
    if (requestedAreaId && requestedAreaId !== req.membership.areaId) {
      throw createHttpError(403, 'Chỉ được thao tác trong khu vực được phân công.')
    }
    return req.membership.areaId
  }
  if (required && !requestedAreaId) throw createHttpError(400, 'Ao/bể phải được gán vào khu vực.')
  return requestedAreaId
}

async function assertAreaBelongsToFarm(farmId, areaId) {
  if (!areaId) return
  const area = await prisma.area.findFirst({ where: { id: areaId, farmId }, select: { id: true } })
  if (!area) throw createHttpError(400, 'Khu vực không thuộc trang trại đang quản lý.')
}

function requireScopedArea(req) {
  if (req.membership.role !== 'owner' && !req.membership.areaId) {
    throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
  }
}

function scopedWhere(req, extra = {}) {
  requireScopedArea(req)
  return {
    farmId: req.params.farmId,
    ...(req.membership.role === 'owner' ? {} : { areaId: req.membership.areaId }),
    ...extra,
  }
}

function serializeTank(tank) {
  return { ...tank, volumeM3: tank.volumeM3.toString() }
}

export async function listPondTanks(req, res) {
  const where = {}
  const q = req.query.q?.trim()
  const status = req.query.status
  const tankType = req.query.tankType

  if (q) where.OR = [{ code: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }]
  if (status) {
    if (!TANK_STATUSES.includes(status)) throw createHttpError(400, 'Trạng thái ao/bể không hợp lệ.')
    where.status = status
  }
  if (tankType) where.tankType = validateType(tankType)

  if (req.membership.role === 'owner' && req.query.areaId) {
    await assertAreaBelongsToFarm(req.params.farmId, req.query.areaId)
    where.areaId = req.query.areaId
  }

  const tanks = await prisma.pondTank.findMany({
    where: scopedWhere(req, where),
    include: { area: { select: { id: true, code: true, name: true } } },
    orderBy: [{ status: 'asc' }, { code: 'asc' }],
  })
  return sendData(res, tanks.map(serializeTank))
}

export async function getPondTank(req, res) {
  const tank = await prisma.pondTank.findFirst({
    where: scopedWhere(req, { id: req.params.tankId }),
    include: { area: { select: { id: true, code: true, name: true } } },
  })
  if (!tank) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền.')
  return sendData(res, serializeTank(tank))
}

export async function createPondTank(req, res) {
  const code = normalizeCode(req.body.code)
  const name = req.body.name?.trim()
  const tankType = validateType(req.body.tankType || 'nursery_tank')
  const areaId = ensureAreaId(req, req.body.areaId, { required: req.membership.role === 'area_manager' })

  if (!validCode(code)) throw createHttpError(400, 'Mã ao/bể phải có 2-50 ký tự hợp lệ.')
  if (!name || name.length > 100) throw createHttpError(400, 'Tên ao/bể phải từ 1 đến 100 ký tự.')
  if (typeof req.body.description === 'string' && req.body.description.length > 2000) throw createHttpError(400, 'Mô tả không được vượt quá 2.000 ký tự.')
  const volumeM3 = parseVolume(req.body.volumeM3)
  await assertAreaBelongsToFarm(req.params.farmId, areaId)

  try {
    const tank = await prisma.pondTank.create({
      data: { farmId: req.params.farmId, areaId, code, name, tankType, volumeM3, description: req.body.description?.trim() || null },
      include: { area: { select: { id: true, code: true, name: true } } },
    })
    return sendData(res, serializeTank(tank), 201)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã ao/bể đã tồn tại trong trang trại.')
    throw error
  }
}

export async function updatePondTank(req, res) {
  const existing = await prisma.pondTank.findFirst({ where: scopedWhere(req, { id: req.params.tankId }) })
  if (!existing) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền.')

  const data = {}
  if (typeof req.body.code === 'string') {
    const code = normalizeCode(req.body.code)
    if (!validCode(code)) throw createHttpError(400, 'Mã ao/bể phải có 2-50 ký tự hợp lệ.')
    data.code = code
  }
  if (typeof req.body.name === 'string') {
    const name = req.body.name.trim()
    if (!name || name.length > 100) throw createHttpError(400, 'Tên ao/bể phải từ 1 đến 100 ký tự.')
    data.name = name
  }
  if (typeof req.body.tankType === 'string') data.tankType = validateType(req.body.tankType)
  if (req.body.volumeM3 !== undefined) data.volumeM3 = parseVolume(req.body.volumeM3)
  if (typeof req.body.description === 'string' || req.body.description === null) {
    if (typeof req.body.description === 'string' && req.body.description.length > 2000) throw createHttpError(400, 'Mô tả không được vượt quá 2.000 ký tự.')
    data.description = req.body.description?.trim() || null
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'areaId')) {
    data.areaId = ensureAreaId(req, req.body.areaId)
    await assertAreaBelongsToFarm(req.params.farmId, data.areaId)
  }

  try {
    const tank = await prisma.pondTank.update({
      where: { id: existing.id },
      data,
      include: { area: { select: { id: true, code: true, name: true } } },
    })
    return sendData(res, serializeTank(tank))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã ao/bể đã tồn tại trong trang trại.')
    throw error
  }
}

export async function updatePondTankStatus(req, res) {
  const status = req.body.status
  if (!TANK_STATUSES.includes(status)) throw createHttpError(400, 'Trạng thái ao/bể không hợp lệ.')
  const existing = await prisma.pondTank.findFirst({ where: scopedWhere(req, { id: req.params.tankId }) })
  if (!existing) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền.')
  if (!STATUS_TRANSITIONS[existing.status]?.includes(status)) {
    throw createHttpError(409, `Không thể chuyển ao/bể từ trạng thái ${existing.status} sang ${status}.`)
  }

  const tank = await prisma.pondTank.update({
    where: { id: existing.id },
    data: { status },
    include: { area: { select: { id: true, code: true, name: true } } },
  })
  return sendData(res, serializeTank(tank))
}

export async function deletePondTank(req, res) {
  const existing = await prisma.pondTank.findFirst({ where: scopedWhere(req, { id: req.params.tankId }) })
  if (!existing) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền.')
  if (!['empty', 'inactive'].includes(existing.status)) throw createHttpError(409, 'Chỉ được xóa ao/bể đang trống hoặc ngừng sử dụng.')
  await prisma.pondTank.delete({ where: { id: existing.id } })
  return res.status(204).end()
}
