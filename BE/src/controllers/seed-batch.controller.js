import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { createUploadSignature, getOwnedCloudinaryAsset } from '../config/cloudinary.js'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { deriveGrowthMetrics, getQuantityDelta } from '../utils/seed-batch-metrics.js'
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
const BROODSTOCK_STATUSES = ['spf', 'spr', 'standard', 'unknown']
const TECHNICAL_FIELDS = ['species', 'developmentStage', 'broodstockLine', 'broodstockStatus', 'notes']
const EDITABLE_FIELDS = [
  'batchCode', 'supplierLotCode', 'supplierId', 'species', 'developmentStage', 'broodstockLine',
  'broodstockStatus', 'source', 'documentedQuantity', 'productionDate', 'receivedAt',
  'transportDurationMinutes', 'healthCertificateUrl', 'healthCertificatePublicId', 'stockedDate', 'expectedSaleDate', 'notes',
]
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function scopedTankWhere(req) {
  if (req.membership.role !== 'owner' && !req.membership.areaId) {
    throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
  }
  return {
    farmId: req.params.farmId,
    ...(req.membership.role === 'owner' ? {} : { areaId: req.membership.areaId }),
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
  if (!Number.isSafeInteger(value) || value < min) throw createHttpError(400, `${label} phải là số nguyên từ ${min} trở lên.`)
  return value
}

function dateOnly(value, label, { optional = false } = {}) {
  if ((value === null || value === undefined || value === '') && optional) return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw createHttpError(400, `${label} phải theo định dạng YYYY-MM-DD.`)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw createHttpError(400, `${label} không hợp lệ.`)
  return parsed
}

function timestamp(value, label, { optional = false } = {}) {
  if ((value === null || value === undefined || value === '') && optional) return null
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw createHttpError(400, `${label} phải là thời gian ISO hợp lệ.`)
  return new Date(value)
}

function normalizeInput(body, { partial = false, allowedFields = EDITABLE_FIELDS, allowTankId = false } = {}) {
  const unknown = Object.keys(body).filter((field) => !allowedFields.includes(field) && field !== 'tankId')
  if (unknown.length) throw createHttpError(400, `Trường không được hỗ trợ: ${unknown.join(', ')}.`)
  if (!allowTankId && Object.prototype.hasOwnProperty.call(body, 'tankId')) {
    throw createHttpError(400, 'Không hỗ trợ chuyển lô sang ao/bể khác qua cập nhật thông tin.')
  }

  const data = {}
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key)
  const setText = (key, label, max, options) => { if (has(key)) data[key] = text(body[key], label, max, options) }

  setText('batchCode', 'Mã lô', 50, { required: true })
  if (has('batchCode') && !/^[A-Za-z0-9][A-Za-z0-9_-]{1,49}$/.test(data.batchCode)) {
    throw createHttpError(400, 'Mã lô phải có 2-50 ký tự chữ, số, gạch ngang hoặc gạch dưới.')
  }
  setText('supplierLotCode', 'Mã lô của nhà cung cấp', 80, { required: true })
  setText('developmentStage', 'Giai đoạn phát triển', 50, { required: true })
  setText('broodstockLine', 'Dòng tôm bố mẹ', 100, { nullable: true })
  setText('source', 'Nguồn giống', 150, { required: true })
  setText('healthCertificateUrl', 'Đường dẫn giấy chứng nhận', 2000, { nullable: true })
  setText('healthCertificatePublicId', 'Cloudinary public ID', 100, { nullable: true })
  setText('notes', 'Ghi chú', 4000, { nullable: true })

  if (has('species')) {
    if (!SPECIES.includes(body.species)) throw createHttpError(400, 'Loài tôm không hợp lệ.')
    data.species = body.species
  } else if (!partial) throw createHttpError(400, 'Loài tôm là bắt buộc.')
  if (has('broodstockStatus')) {
    if (!BROODSTOCK_STATUSES.includes(body.broodstockStatus)) throw createHttpError(400, 'Tình trạng tôm bố mẹ không hợp lệ.')
    data.broodstockStatus = body.broodstockStatus
  }
  if (has('supplierId')) data.supplierId = validateUuid(body.supplierId, 'Mã nhà cung cấp', { optional: true })
  if (has('documentedQuantity')) data.documentedQuantity = integer(body.documentedQuantity, 'Số lượng theo chứng từ')
  else if (!partial) data.documentedQuantity = 0
  if (has('transportDurationMinutes')) data.transportDurationMinutes = integer(body.transportDurationMinutes, 'Thời gian vận chuyển')
  else if (!partial) data.transportDurationMinutes = null

  for (const [key, label, options] of [
    ['productionDate', 'Ngày sản xuất', { optional: true }],
    ['stockedDate', 'Ngày thả', {}],
    ['expectedSaleDate', 'Ngày dự kiến bán', {}],
  ]) {
    if (has(key)) data[key] = dateOnly(body[key], label, options)
    else if (!partial && !options.optional) throw createHttpError(400, `${label} là bắt buộc.`)
  }
  if (has('receivedAt')) data.receivedAt = timestamp(body.receivedAt, 'Thời điểm tiếp nhận', { optional: true })
  else if (!partial) data.receivedAt = null

  if (!partial) {
    if (!data.batchCode) throw createHttpError(400, 'Mã lô là bắt buộc.')
    if (!data.supplierLotCode) throw createHttpError(400, 'Mã lô của nhà cung cấp là bắt buộc.')
    if (!data.developmentStage) throw createHttpError(400, 'Giai đoạn phát triển là bắt buộc.')
    if (!data.source) throw createHttpError(400, 'Nguồn giống là bắt buộc.')
    data.batchCode = data.batchCode?.toUpperCase()
    data.documentedQuantity ??= 0
    data.broodstockStatus ??= 'unknown'
    data.broodstockLine ??= null
    data.healthCertificateUrl ??= null
    data.healthCertificatePublicId ??= null
    data.notes ??= null
  }
  if (partial && !Object.keys(data).length) throw createHttpError(400, 'Không có thông tin hợp lệ để cập nhật.')
  return data
}

async function verifyHealthCertificate(req, data) {
  if (!Object.prototype.hasOwnProperty.call(data, 'healthCertificatePublicId')) return
  if (!data.healthCertificatePublicId) {
    data.healthCertificateUrl = null
    data.healthCertificateFormat = null
    return
  }
  if (!UUID_PATTERN.test(data.healthCertificatePublicId)) throw createHttpError(400, 'Cloudinary public ID is invalid.')
  const expectedFolder = `chillshrimp/farms/${req.params.farmId}/seed-certificates`
  const asset = await getOwnedCloudinaryAsset({ resourceType: 'image', publicId: data.healthCertificatePublicId, expectedFolder })
    || await getOwnedCloudinaryAsset({ resourceType: 'raw', publicId: data.healthCertificatePublicId, expectedFolder })
  if (!asset) throw createHttpError(400, 'The certificate file is missing, unsupported, too large, or belongs to another farm.')
  data.healthCertificateUrl = asset.secureUrl
  data.healthCertificatePublicId = asset.publicId
  data.healthCertificateFormat = asset.format
}

export async function createSeedBatchUploadSignature(req, res) {
  if (!['owner', 'area_manager'].includes(req.membership.role)) throw createHttpError(403, 'Only Owner or Area Manager can upload seed certificates.')
  const folder = `chillshrimp/farms/${req.params.farmId}/seed-certificates`
  const publicId = randomUUID()
  const signed = createUploadSignature({ folder, publicId })
  return sendData(res, { ...signed, folder, publicId, resourceType: 'auto', maxBytes: 10 * 1024 * 1024 })
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
    ...(q ? { OR: [{ batchCode: { contains: q, mode: 'insensitive' } }, { supplierLotCode: { contains: q, mode: 'insensitive' } }, { species: { contains: q, mode: 'insensitive' } }] } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.seedBatch.findMany({
      where,
      include: { tank: { include: { area: { select: { id: true, code: true, name: true } } } }, supplier: true },
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }], skip, take: limit,
    }),
    prisma.seedBatch.count({ where }),
  ])
  return sendData(res, { items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
}

export async function getSeedBatch(req, res) {
  return sendData(res, await findBatch(req, req.params.batchId))
}

export async function getBatchQuantityEvents(req, res) {
  const batch = await findBatch(req, req.params.batchId)
  const { page, limit, skip } = parsePagination(req.query)
  const where = { batchId: batch.id }
  const [items, total] = await prisma.$transaction([
    prisma.batchQuantityEvent.findMany({ where, include: { fromTank: { select: { id: true, code: true, name: true } }, toTank: { select: { id: true, code: true, name: true } }, creator: { select: { id: true, displayName: true } } }, orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }], skip, take: limit }),
    prisma.batchQuantityEvent.count({ where }),
  ])
  return sendData(res, { items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
}

function positiveQuantity(value, label = 'Số lượng biến động') {
  return integer(value, label, { min: 1, required: true })
}

function eventReason(value) {
  return text(value, 'Lý do', 1000, { required: true })
}

export async function createBatchQuantityEvent(req, res) {
  const role = req.membership.role
  if (!['owner', 'area_manager', 'technician'].includes(role)) throw createHttpError(403, 'Vai trò hiện tại không có quyền ghi biến động số lượng.')
  const eventType = req.body.eventType
  if (!['mortality', 'adjustment', 'transfer'].includes(eventType)) throw createHttpError(400, 'Loại biến động không hợp lệ.')
  const allowed = ['eventType', 'quantity', 'adjustmentDirection', 'targetTankId', 'occurredAt', 'reason', 'notes']
  const unknown = Object.keys(req.body).filter((key) => !allowed.includes(key))
  if (unknown.length) throw createHttpError(400, `Trường không được hỗ trợ: ${unknown.join(', ')}.`)
  if (eventType !== 'transfer' && req.body.targetTankId !== undefined) throw createHttpError(400, 'Chỉ sự kiện chuyển ao/bể mới nhận ao/bể đích.')
  const quantity = positiveQuantity(req.body.quantity)
  const occurredAt = req.body.occurredAt === undefined ? new Date() : timestamp(req.body.occurredAt, 'Thời điểm phát sinh')
  const notes = req.body.notes === undefined || req.body.notes === null || req.body.notes === '' ? null : text(req.body.notes, 'Ghi chú', 4000, { nullable: true })
  const reason = eventReason(req.body.reason)
  const batchId = validateUuid(req.params.batchId, 'Mã lô giống')

  if (eventType === 'transfer' && !['owner', 'area_manager'].includes(role)) {
    throw createHttpError(403, 'Chỉ Owner hoặc Area Manager được chuyển ao/bể của lô.')
  }
  if (eventType === 'adjustment' && !['owner', 'area_manager'].includes(role)) {
    throw createHttpError(403, 'Chỉ Owner hoặc Area Manager được điều chỉnh số lượng lô.')
  }
  if (eventType === 'transfer') {
    const targetTankId = validateUuid(req.body.targetTankId, 'Ao/bể tiếp nhận')
    try {
      const events = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM seed_batches WHERE id = ${batchId}::uuid FOR UPDATE`
        const lockedBatch = await tx.seedBatch.findFirst({ where: { id: batchId, ...scopedBatchWhere(req) } })
        if (!lockedBatch) throw createHttpError(404, 'Không tìm thấy lô giống trong phạm vi được cấp quyền.')
        if (!['active', 'ready_for_sale'].includes(lockedBatch.status)) throw createHttpError(409, 'Chỉ có thể chuyển lô đang hoạt động hoặc sẵn sàng bán.')
        if (quantity !== lockedBatch.currentEstimatedQuantity) throw createHttpError(400, 'Do lô chỉ liên kết với một ao/bể, chỉ hỗ trợ chuyển toàn bộ số lượng hiện tại.')
        for (const id of [lockedBatch.tankId, targetTankId].sort()) {
          await tx.$queryRaw`SELECT id FROM ponds_tanks WHERE id = ${id}::uuid FOR UPDATE`
        }
        const target = await tx.pondTank.findFirst({
          where: { id: targetTankId, ...scopedTankWhere(req), deletedAt: null },
          include: { area: { select: { status: true } } },
        })
        if (!target) throw createHttpError(404, 'Không tìm thấy ao/bể đích trong phạm vi được cấp quyền.')
        if (target.id === lockedBatch.tankId) throw createHttpError(400, 'Ao/bể đích phải khác ao/bể hiện tại.')
        if (target.status !== 'empty' || (target.areaId && target.area?.status !== 'active')) {
          throw createHttpError(409, 'Ao/bể đích phải đang trống và thuộc khu vực hoạt động.')
        }
        const sourceTankId = lockedBatch.tankId
        const outEvent = await tx.batchQuantityEvent.create({ data: {
          batchId, fromTankId: sourceTankId, createdBy: req.auth.id, eventType: 'transfer_out', quantity,
          occurredAt, reason, notes,
        } })
        const inEvent = await tx.batchQuantityEvent.create({ data: {
          batchId, toTankId: targetTankId, createdBy: req.auth.id, eventType: 'transfer_in', quantity,
          occurredAt, reason, notes,
        } })
        await tx.pondTank.update({ where: { id: sourceTankId }, data: { status: 'empty' } })
        await tx.pondTank.update({ where: { id: targetTankId }, data: { status: 'active' } })
        await tx.seedBatch.update({ where: { id: batchId }, data: { tankId: targetTankId } })
        return [outEvent, inEvent]
      })
      return sendData(res, { events, batch: await findBatch(req, batchId) }, 201)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw createHttpError(409, 'Ao/bể đích vừa được một lô khác sử dụng. Tải lại dữ liệu rồi thử lại.')
      }
      throw error
    }
  }

  const adjustmentDirection = eventType === 'adjustment' ? req.body.adjustmentDirection : null
  if (eventType !== 'adjustment' && req.body.adjustmentDirection !== undefined) throw createHttpError(400, 'Chỉ sự kiện điều chỉnh mới nhận hướng tăng/giảm.')
  if (eventType === 'adjustment' && !['increase', 'decrease'].includes(adjustmentDirection)) {
    throw createHttpError(400, 'Điều chỉnh số lượng cần chọn tăng hoặc giảm.')
  }
  const batch = await findBatch(req, batchId)
  const delta = getQuantityDelta(eventType, quantity, adjustmentDirection)
  const nextQuantity = batch.currentEstimatedQuantity + delta
  if (!['active', 'ready_for_sale'].includes(batch.status)) throw createHttpError(409, 'Không thể thay đổi số lượng lô đã kết thúc.')
  if (nextQuantity < 0) throw createHttpError(409, 'Số lượng biến động vượt quá số lượng hiện tại của lô.')

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM seed_batches WHERE id = ${batchId}::uuid FOR UPDATE`
    const lockedBatch = await tx.seedBatch.findFirst({ where: { id: batchId, ...scopedBatchWhere(req) } })
    if (!lockedBatch) throw createHttpError(404, 'Không tìm thấy lô giống trong phạm vi được cấp quyền.')
    if (!['active', 'ready_for_sale'].includes(lockedBatch.status)) throw createHttpError(409, 'Không thể thay đổi số lượng lô đã kết thúc.')
    const currentNext = lockedBatch.currentEstimatedQuantity + delta
    if (currentNext < 0) throw createHttpError(409, 'Số lượng biến động vượt quá số lượng hiện tại của lô.')
    const event = await tx.batchQuantityEvent.create({ data: {
      batchId, createdBy: req.auth.id, eventType, adjustmentDirection,
      quantity, occurredAt, reason, notes,
    } })
    await tx.seedBatch.update({
      where: { id: batchId },
      data: { currentEstimatedQuantity: currentNext, ...(currentNext === 0 ? { status: 'failed' } : {}) },
    })
    if (currentNext === 0) await tx.pondTank.update({ where: { id: lockedBatch.tankId }, data: { status: 'empty' } })
    return { event, currentEstimatedQuantity: currentNext }
  })
  return sendData(res, result, 201)
}

export async function getGrowthSamplingLogs(req, res) {
  const batch = await findBatch(req, req.params.batchId)
  const { page, limit, skip } = parsePagination(req.query)
  const where = { batchId: batch.id }
  const [items, total] = await prisma.$transaction([
    prisma.growthSamplingLog.findMany({ where, include: { sampler: { select: { id: true, displayName: true } } }, orderBy: [{ sampledAt: 'desc' }, { createdAt: 'desc' }], skip, take: limit }),
    prisma.growthSamplingLog.count({ where }),
  ])
  return sendData(res, { items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
}

function optionalMeasurement(value, label, { max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) throw createHttpError(400, `${label} phải là số không âm hợp lệ.`)
  return parsed
}

export async function createGrowthSamplingLog(req, res) {
  const batch = await findBatch(req, req.params.batchId)
  if (!['active', 'ready_for_sale'].includes(batch.status)) throw createHttpError(409, 'Chỉ ghi mẫu tăng trưởng cho lô đang hoạt động hoặc sẵn sàng bán.')
  const allowed = ['sampledAt', 'method', 'sampleCount', 'totalSampleWeightG', 'averageWeightG', 'averageLengthMm', 'lengthMinMm', 'lengthMaxMm', 'estimatedQuantity', 'biomassKg', 'uniformityScore', 'notes']
  const unknown = Object.keys(req.body).filter((key) => !allowed.includes(key))
  if (unknown.length) throw createHttpError(400, `Trường không được hỗ trợ: ${unknown.join(', ')}.`)
  const method = req.body.method
  if (!['manual', 'ai', 'combined'].includes(method)) throw createHttpError(400, 'Phương pháp lấy mẫu không hợp lệ.')
  const sampleCount = integer(req.body.sampleCount, 'Cỡ mẫu', { min: 1, required: true })
  const sampledAt = req.body.sampledAt === undefined ? new Date() : timestamp(req.body.sampledAt, 'Thời điểm lấy mẫu')
  const totalSampleWeightG = optionalMeasurement(req.body.totalSampleWeightG, 'Tổng khối lượng mẫu')
  const averageWeightInput = optionalMeasurement(req.body.averageWeightG, 'Khối lượng trung bình')
  const averageLengthMm = optionalMeasurement(req.body.averageLengthMm, 'Chiều dài trung bình')
  const lengthMinMm = optionalMeasurement(req.body.lengthMinMm, 'Chiều dài nhỏ nhất')
  const lengthMaxMm = optionalMeasurement(req.body.lengthMaxMm, 'Chiều dài lớn nhất')
  const estimatedQuantity = req.body.estimatedQuantity === undefined || req.body.estimatedQuantity === null || req.body.estimatedQuantity === ''
    ? null : integer(req.body.estimatedQuantity, 'Số lượng ước tính')
  const biomassInput = optionalMeasurement(req.body.biomassKg, 'Sinh khối')
  const uniformityScore = optionalMeasurement(req.body.uniformityScore, 'Độ đồng đều', { max: 100 })
  if (lengthMinMm !== null && lengthMaxMm !== null && lengthMinMm > lengthMaxMm) throw createHttpError(400, 'Chiều dài nhỏ nhất không được lớn hơn chiều dài lớn nhất.')
  const { averageWeightG, biomassKg } = deriveGrowthMetrics({
    sampleCount, totalSampleWeightG, averageWeightG: averageWeightInput, estimatedQuantity, biomassKg: biomassInput,
  })
  const notes = req.body.notes === undefined || req.body.notes === null || req.body.notes === '' ? null : text(req.body.notes, 'Ghi chú', 4000, { nullable: true })

  const item = await prisma.growthSamplingLog.create({ data: {
    batchId: batch.id, sampledBy: req.auth.id, sampledAt, method, sampleCount,
    totalSampleWeightG, averageWeightG, averageLengthMm, lengthMinMm, lengthMaxMm,
    estimatedQuantity, biomassKg, uniformityScore, notes,
  } })
  return sendData(res, item, 201)
}

export async function createSeedBatch(req, res) {
  const data = normalizeInput(req.body, {
    partial: false,
    allowedFields: [...EDITABLE_FIELDS, 'initialQuantity', 'tankId'],
    allowTankId: true,
  })
  const tankId = validateUuid(req.body.tankId, 'Mã ao/bể')
  const initialQuantity = integer(req.body.initialQuantity, 'Số lượng tiếp nhận', { min: 1, required: true })
  if (Object.prototype.hasOwnProperty.call(req.body, 'healthCertificatePublicId')) await verifyHealthCertificate(req, data)
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
      await tx.batchQuantityEvent.create({
        data: {
          batchId: created.id,
          toTankId: tankId,
          createdBy: req.auth.id,
          eventType: 'stocking',
          quantity: initialQuantity,
          occurredAt: data.stockedDate,
          notes: 'Ghi nhận số lượng tiếp nhận ban đầu.',
        },
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
  await verifyHealthCertificate(req, data)
  validateDateOrder(data, existing)
  if (data.supplierId) {
    const supplier = await prisma.seedSupplier.findFirst({ where: { id: data.supplierId, farmId: req.params.farmId }, select: { id: true } })
    if (!supplier) throw createHttpError(400, 'Nhà cung cấp không tồn tại trong trang trại này.')
  }

  try {
    const updated = await prisma.seedBatch.update({
      where: { id: existing.id }, data,
      include: { tank: { include: { area: { select: { id: true, code: true, name: true } } } }, supplier: true },
    })
    return sendData(res, updated)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã lô đã tồn tại.')
    throw error
  }
}

export async function updateSeedBatchStatus(req, res) {
  if (!['owner', 'area_manager'].includes(req.membership.role)) {
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
