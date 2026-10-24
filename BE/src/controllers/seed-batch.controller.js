import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { isSeedBatchEditable } from '../utils/seed-batch-lifecycle.js'

const BATCH_STATUSES = ['active', 'ready_for_sale', 'sold', 'failed', 'cancelled']
const BATCH_STATUS_TRANSITIONS = {
  active: ['ready_for_sale', 'failed', 'cancelled'],
  ready_for_sale: ['sold'],
  sold: [],
  failed: [],
  cancelled: [],
}
const SPECIES = ['white_leg_shrimp', 'black_tiger_shrimp']
const TECHNICAL_FIELDS = ['species', 'developmentStage', 'notes']
const EDITABLE_FIELDS = ['batchCode', 'supplierId', 'species', 'developmentStage', 'currentEstimatedQuantity', 'stockedDate', 'expectedSaleDate', 'notes']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function scopedTankWhere(req) {
  if (!['owner', 'farm_manager'].includes(req.membership.role) && !req.membership.areaId) {
    throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
  }
  return {
    farmId: req.params.farmId,
    ...(['owner', 'farm_manager'].includes(req.membership.role) ? {} : { areaId: req.membership.areaId }),
  }
}

function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page)
  const limit = query.limit === undefined ? 50 : Number(query.limit)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createHttpError(400, 'page phải từ 1; limit phải từ 1 đến 100.')
  }
  return { page, limit, skip: (page - 1) * limit }
}

function validateUuid(value, label, { optional = false } = {}) {
  if (optional && (value === null || value === undefined || value === '')) return null
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw createHttpError(400, `${label} không hợp lệ.`)
  return value
}

function text(value, label, max, { required = false, nullable = false } = {}) {
  if (value === null && nullable) return null
  if (typeof value !== 'string') throw createHttpError(400, `${label} phải là chuỗi${nullable ? ' hoặc null' : ''}.`)
  const normalized = value.trim()
  if ((required && !normalized) || normalized.length > max) {
    throw createHttpError(400, `${label} ${required ? 'bắt buộc và ' : ''}không được vượt quá ${max} ký tự.`)
  }
  return normalized || (nullable ? null : normalized)
}

function integer(value, label, { min = 0, required = false } = {}) {
  if (value === undefined && !required) return undefined
  if (!Number.isSafeInteger(value) || value < min || value > 2147483647) throw createHttpError(400, `${label} phải là số nguyên từ ${min} trở lên.`)
  return value
}

function dateOnly(value, label, { optional = false } = {}) {
  if ((value === null || value === undefined || value === '') && optional) return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw createHttpError(400, `${label} phải theo định dạng YYYY-MM-DD.`)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw createHttpError(400, `${label} không hợp lệ.`)
  return parsed
}

function normalizeInput(body, { partial = false, allowedFields = EDITABLE_FIELDS, allowTankId = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw createHttpError(400, 'Dữ liệu lô giống không hợp lệ.')
  const unknown = Object.keys(body).filter((field) => !allowedFields.includes(field))
  if (unknown.length) throw createHttpError(400, `Trường không được hỗ trợ: ${unknown.join(', ')}.`)
  if (!allowTankId && Object.hasOwn(body, 'tankId')) throw createHttpError(400, 'Không hỗ trợ chuyển ao/bể qua cập nhật thông tin.')
  const data = {}
  const has = (key) => Object.hasOwn(body, key)
  for (const [key, label, max, options] of [
    ['batchCode', 'Mã lô', 50, { required: true }],
    ['developmentStage', 'Giai đoạn phát triển', 50, { required: true }],
    ['notes', 'Ghi chú', 4000, { nullable: true }],
  ]) if (has(key)) data[key] = text(body[key], label, max, options)
  if (has('batchCode')) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,49}$/.test(data.batchCode)) throw createHttpError(400, 'Mã lô phải có 2-50 ký tự chữ, số, gạch ngang hoặc gạch dưới.')
    data.batchCode = data.batchCode.toUpperCase()
  }
  if (has('species')) {
    if (!SPECIES.includes(body.species)) throw createHttpError(400, 'Loài tôm không hợp lệ.')
    data.species = body.species
  }
  if (has('supplierId')) data.supplierId = validateUuid(body.supplierId, 'Mã nhà cung cấp', { optional: true })
  if (has('currentEstimatedQuantity')) data.currentEstimatedQuantity = integer(body.currentEstimatedQuantity, 'Số lượng hiện tại', { required: true })
  for (const [key, label] of [['stockedDate', 'Ngày thả'], ['expectedSaleDate', 'Ngày dự kiến bán']]) {
    if (has(key)) data[key] = dateOnly(body[key], label)
  }
  if (!partial) {
    for (const key of ['batchCode', 'species', 'developmentStage', 'stockedDate', 'expectedSaleDate']) {
      if (!data[key]) throw createHttpError(400, `Trường ${key} là bắt buộc.`)
    }
    data.notes ??= null
  }
  if (partial && !Object.keys(data).length) throw createHttpError(400, 'Không có thông tin hợp lệ để cập nhật.')
  return data
}

function validateDateOrder(data, existing = {}) {
  const stockedDate = data.stockedDate ?? existing.stockedDate
  const expectedSaleDate = data.expectedSaleDate ?? existing.expectedSaleDate
  if (expectedSaleDate < stockedDate) throw createHttpError(400, 'Ngày dự kiến bán không được trước ngày thả.')
}

function scopedBatchWhere(req) {
  return { tank: scopedTankWhere(req) }
}

async function findBatch(req, batchId) {
  validateUuid(batchId, 'Mã lô giống')
  const batch = await prisma.seedBatch.findFirst({
    where: { id: batchId, ...scopedBatchWhere(req) },
    include: { tank: { include: { area: { select: { id: true, code: true, name: true } } } }, supplier: true },
  })
  if (!batch) throw createHttpError(404, 'Không tìm thấy lô giống trong phạm vi được cấp quyền.')
  return batch
}

export async function listSeedBatches(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (q.length > 100) throw createHttpError(400, 'Từ khóa tìm kiếm không được vượt quá 100 ký tự.')
  const status = req.query.status
  if (status && !BATCH_STATUSES.includes(status)) throw createHttpError(400, 'Trạng thái lô giống không hợp lệ.')
  const { page, limit, skip } = parsePagination(req.query)
  const tankWhere = scopedTankWhere(req)
  if (req.query.tankId) tankWhere.id = validateUuid(req.query.tankId, 'Mã ao/bể')
  const supplierId = req.query.supplierId ? validateUuid(req.query.supplierId, 'Mã nhà cung cấp') : undefined
  const where = {
    tank: tankWhere,
    ...(status ? { status } : {}),
    ...(supplierId ? { supplierId } : {}),
    ...(q ? { OR: [{ batchCode: { contains: q, mode: 'insensitive' } }, { species: { contains: q, mode: 'insensitive' } }] } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.seedBatch.findMany({
      where,
      include: { tank: { include: { area: { select: { id: true, code: true, name: true } } } }, supplier: true },
      orderBy: [{ createdAt: 'desc' }], skip, take: limit,
    }),
    prisma.seedBatch.count({ where }),
  ])
  return sendData(res, { items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
}

export async function getSeedBatch(req, res) {
  return sendData(res, await findBatch(req, req.params.batchId))
}

export async function createSeedBatch(req, res) {
  const data = normalizeInput(req.body, {
    partial: false,
    allowedFields: [...EDITABLE_FIELDS.filter(field => field !== 'currentEstimatedQuantity'), 'initialQuantity', 'tankId'],
    allowTankId: true,
  })
  const tankId = validateUuid(req.body.tankId, 'Mã ao/bể')
  const initialQuantity = integer(req.body.initialQuantity, 'Số lượng tiếp nhận', { min: 1, required: true })
  validateDateOrder(data)
  const tankScope = scopedTankWhere(req)
  const supplierId = data.supplierId

  try {
    const batch = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM ponds_tanks WHERE id = ${tankId}::uuid FOR UPDATE`
      const tank = await tx.pondTank.findFirst({
        where: { id: tankId, ...tankScope, deletedAt: null },
        include: { area: { select: { status: true } } },
      })
      if (!tank) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền hoặc ao/bể đã lưu trữ.')
      if (tank.status !== 'empty') throw createHttpError(409, 'Ao/bể phải ở trạng thái trống để tiếp nhận lô giống.')
      if (tank.areaId && tank.area?.status !== 'active') throw createHttpError(409, 'Khu vực của ao/bể đã ngừng hoạt động.')

      if (supplierId) {
        const supplier = await tx.seedSupplier.findFirst({ where: { id: supplierId, farmId: req.params.farmId }, select: { id: true } })
        if (!supplier) throw createHttpError(400, 'Nhà cung cấp không tồn tại trong trang trại này.')
      }

      const created = await tx.seedBatch.create({
        data: { ...data, tankId, initialQuantity, currentEstimatedQuantity: initialQuantity, status: 'active' },
        include: { tank: { include: { area: { select: { id: true, code: true, name: true } } } }, supplier: true },
      })
      await tx.pondTank.update({ where: { id: tankId }, data: { status: 'active' } })
      return created
    })
    return sendData(res, batch, 201)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw createHttpError(409, 'Mã lô đã tồn tại hoặc ao/bể đã có lô đang hoạt động.')
    }
    throw error
  }
}

export async function updateSeedBatch(req, res) {
  const existing = await findBatch(req, req.params.batchId)
  if (!isSeedBatchEditable(existing.status)) {
    throw createHttpError(409, 'Không thể cập nhật thông tin lô đã kết thúc.')
  }
  const fields = req.membership.role === 'technician' ? TECHNICAL_FIELDS : EDITABLE_FIELDS
  const forbidden = Object.keys(req.body).filter((field) => !fields.includes(field))
  if (forbidden.length) throw createHttpError(403, `Bạn không có quyền cập nhật trường: ${forbidden.join(', ')}.`)
  const data = normalizeInput(req.body, { partial: true, allowedFields: fields })
  validateDateOrder(data, existing)
  if (data.supplierId) {
    const supplier = await prisma.seedSupplier.findFirst({ where: { id: data.supplierId, farmId: req.params.farmId }, select: { id: true } })
    if (!supplier) throw createHttpError(400, 'Nhà cung cấp không tồn tại trong trang trại này.')
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM seed_batches WHERE id = ${existing.id}::uuid FOR UPDATE`
      const current = await tx.seedBatch.findFirst({ where: { id: existing.id, ...scopedBatchWhere(req) } })
      if (!current) throw createHttpError(404, 'Không tìm thấy lô giống trong phạm vi được cấp quyền.')
      if (!isSeedBatchEditable(current.status)) throw createHttpError(409, 'Không thể cập nhật thông tin lô đã kết thúc.')
      validateDateOrder(data, current)
      if (data.currentEstimatedQuantity === 0) data.status = 'failed'
      const item = await tx.seedBatch.update({
        where: { id: current.id }, data,
        include: { tank: { include: { area: { select: { id: true, code: true, name: true } } } }, supplier: true },
      })
      if (data.currentEstimatedQuantity === 0) await tx.pondTank.update({ where: { id: current.tankId }, data: { status: 'empty' } })
      return item
    })
    return sendData(res, updated)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã lô đã tồn tại.')
    throw error
  }
}

export async function updateSeedBatchStatus(req, res) {
  if (!['owner', 'farm_manager', 'area_manager'].includes(req.membership.role)) {
    throw createHttpError(403, 'Chỉ Owner hoặc Quản lý khu vực được cập nhật trạng thái lô giống.')
  }
  const status = req.body.status
  if (!BATCH_STATUSES.includes(status)) throw createHttpError(400, 'Trạng thái lô giống không hợp lệ.')
  const existing = await findBatch(req, req.params.batchId)
  if (!BATCH_STATUS_TRANSITIONS[existing.status]?.includes(status)) {
    throw createHttpError(409, `Không thể chuyển lô từ trạng thái ${existing.status} sang ${status}.`)
  }
  const result = await prisma.seedBatch.updateMany({
    where: { id: existing.id, status: existing.status },
    data: { status },
  })
  if (!result.count) throw createHttpError(409, 'Trạng thái lô đã được thay đổi. Tải lại dữ liệu và thử lại.')
  return sendData(res, await findBatch(req, existing.id))
}
