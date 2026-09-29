import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

const SUPPLIER_FIELDS = ['name', 'licenseNo', 'phone', 'address', 'broodstockInformation', 'notes']
const FIELD_LIMITS = {
  name: 150,
  licenseNo: 80,
  phone: 20,
  address: 4000,
  broodstockInformation: 4000,
  notes: 4000,
}
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validateUuid(value, label) {
  if (!UUID_PATTERN.test(value || '')) throw createHttpError(400, `${label} khÃ´ng há»£p lá»‡.`)
}

function normalizeSupplierInput(body, { partial = false } = {}) {
  const data = {}

  for (const field of SUPPLIER_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue
    const value = body[field]
    if (field === 'name') {
      if (typeof value !== 'string' || !value.trim() || value.trim().length > FIELD_LIMITS.name) {
        throw createHttpError(400, 'TÃªn nhÃ  cung cáº¥p báº¯t buá»™c vÃ  khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 150 kÃ½ tá»±.')
      }
      data.name = value.trim()
      continue
    }

    if (value !== null && typeof value !== 'string') {
      throw createHttpError(400, `TrÆ°á»ng ${field} pháº£i lÃ  chuá»—i hoáº·c null.`)
    }
    if (typeof value === 'string' && value.trim().length > FIELD_LIMITS[field]) {
      throw createHttpError(400, `TrÆ°á»ng ${field} khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ ${FIELD_LIMITS[field]} kÃ½ tá»±.`)
    }
    data[field] = typeof value === 'string' ? (value.trim() || null) : null
  }

  if (!partial && !data.name) {
    throw createHttpError(400, 'TÃªn nhÃ  cung cáº¥p lÃ  báº¯t buá»™c.')
  }
  if (partial && !Object.keys(data).length) {
    throw createHttpError(400, 'KhÃ´ng cÃ³ thÃ´ng tin nhÃ  cung cáº¥p cáº§n cáº­p nháº­t.')
  }
  return data
}

function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page)
  const limit = query.limit === undefined ? 50 : Number(query.limit)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createHttpError(400, 'Tham sá»‘ page/limit khÃ´ng há»£p lá»‡; limit pháº£i tá»« 1 Ä‘áº¿n 100.')
  }
  return { page, limit, skip: (page - 1) * limit }
}

async function findSupplier(farmId, supplierId) {
  validateUuid(supplierId, 'MÃ£ nhÃ  cung cáº¥p')
  const supplier = await prisma.seedSupplier.findFirst({ where: { id: supplierId, farmId } })
  if (!supplier) throw createHttpError(404, 'KhÃ´ng tÃ¬m tháº¥y nhÃ  cung cáº¥p trong trang tráº¡i.')
  return supplier
}

export async function listSeedSuppliers(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (q.length > 150) throw createHttpError(400, 'Tá»« khÃ³a tÃ¬m kiáº¿m khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 150 kÃ½ tá»±.')
  const { page, limit, skip } = parsePagination(req.query)
  const where = {
    farmId: req.params.farmId,
    ...(q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { licenseNo: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ],
    } : {}),
  }

  const [items, total] = await prisma.$transaction([
    prisma.seedSupplier.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
    prisma.seedSupplier.count({ where }),
  ])
  return sendData(res, { items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
}

export async function getSeedSupplier(req, res) {
  const supplier = await findSupplier(req.params.farmId, req.params.supplierId)
  return sendData(res, supplier)
}

export async function createSeedSupplier(req, res) {
  const data = normalizeSupplierInput(req.body)
  const supplier = await prisma.seedSupplier.create({
    data: { ...data, farmId: req.params.farmId },
  })
  return sendData(res, supplier, 201)
}

export async function updateSeedSupplier(req, res) {
  const existing = await findSupplier(req.params.farmId, req.params.supplierId)
  const data = normalizeSupplierInput(req.body, { partial: true })
  const supplier = await prisma.seedSupplier.update({ where: { id: existing.id }, data })
  return sendData(res, supplier)
}

export async function listSupplierSeedBatches(req, res) {
  const supplier = await findSupplier(req.params.farmId, req.params.supplierId)
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (q.length > 80) throw createHttpError(400, 'Tá»« khÃ³a tÃ¬m kiáº¿m khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 80 kÃ½ tá»±.')
  const status = req.query.status
  const validStatuses = ['active', 'ready_for_sale', 'sold', 'failed', 'cancelled']
  if (status && !validStatuses.includes(status)) throw createHttpError(400, 'Tráº¡ng thÃ¡i lÃ´ giá»‘ng khÃ´ng há»£p lá»‡.')
  const { page, limit, skip } = parsePagination(req.query)
  if (req.membership.role === 'area_manager' && !req.membership.areaId) {
    return sendData(res, { supplier: { id: supplier.id, name: supplier.name }, items: [], pagination: { page, limit, total: 0, pageCount: 0 } })
  }
  const tankWhere = {
    farmId: req.params.farmId,
    ...(req.membership.role === 'area_manager' ? { areaId: req.membership.areaId } : {}),
  }
  const where = {
    supplierId: supplier.id,
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ batchCode: { contains: q, mode: 'insensitive' } }, { supplierLotCode: { contains: q, mode: 'insensitive' } }] } : {}),
    tank: tankWhere,
  }

  const [items, total] = await prisma.$transaction([
    prisma.seedBatch.findMany({
      where,
      include: { tank: { select: { id: true, code: true, name: true, areaId: true } } },
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.seedBatch.count({ where }),
  ])
  return sendData(res, { supplier: { id: supplier.id, name: supplier.name }, items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
}
