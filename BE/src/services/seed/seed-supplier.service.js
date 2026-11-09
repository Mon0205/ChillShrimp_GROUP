import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'

const SUPPLIER_FIELDS = ['name', 'phone', 'address']
const FIELD_LIMITS = {
  name: 150,
  phone: 20,
  address: 4000,
}
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validateUuid(value, label) {
  if (!UUID_PATTERN.test(value || '')) throw createHttpError(400, `${label} khÃ´ng há»£p lá»‡.`)
}

function normalizeSupplierInput(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw createHttpError(400, 'Dữ liệu nhà cung cấp không hợp lệ.')
  const unknown = Object.keys(body).filter(field => !SUPPLIER_FIELDS.includes(field))
  if (unknown.length) throw createHttpError(400, `Trường không được hỗ trợ: ${unknown.join(', ')}.`)
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

export async function listSeedSuppliers(context) {
  const q = typeof context.filters.q === 'string' ? context.filters.q.trim() : ''
  if (q.length > 150) throw createHttpError(400, 'Tá»« khÃ³a tÃ¬m kiáº¿m khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 150 kÃ½ tá»±.')
  const { page, limit, skip } = parsePagination(context.filters)
  const where = {
    farmId: context.farmId,
    ...(q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ],
    } : {}),
  }

  const [items, total] = await prisma.$transaction([
    prisma.seedSupplier.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
    prisma.seedSupplier.count({ where }),
  ])
  return { items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } }
}

export async function getSeedSupplier(context) {
  const supplier = await findSupplier(context.farmId, context.supplierId)
  return supplier
}

export async function createSeedSupplier(context) {
  const data = normalizeSupplierInput(context.input)
  const supplier = await prisma.seedSupplier.create({
    data: { ...data, farmId: context.farmId },
  })
  return supplier
}

export async function updateSeedSupplier(context) {
  const existing = await findSupplier(context.farmId, context.supplierId)
  const data = normalizeSupplierInput(context.input, { partial: true })
  const supplier = await prisma.seedSupplier.update({ where: { id: existing.id }, data })
  return supplier
}

export async function listSupplierSeedBatches(context) {
  const supplier = await findSupplier(context.farmId, context.supplierId)
  const q = typeof context.filters.q === 'string' ? context.filters.q.trim() : ''
  if (q.length > 80) throw createHttpError(400, 'Tá»« khÃ³a tÃ¬m kiáº¿m khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 80 kÃ½ tá»±.')
  const status = context.filters.status
  const validStatuses = ['active', 'ready_for_sale', 'sold', 'failed', 'cancelled']
  if (status && !validStatuses.includes(status)) throw createHttpError(400, 'Tráº¡ng thÃ¡i lÃ´ giá»‘ng khÃ´ng há»£p lá»‡.')
  const { page, limit, skip } = parsePagination(context.filters)
  if (context.membership.role === 'AREA_MANAGER' && !context.membership.areaId) {
    return { supplier: { id: supplier.id, name: supplier.name }, items: [], pagination: { page, limit, total: 0, pageCount: 0 } }
  }
  const tankWhere = {
    farmId: context.farmId,
    ...(context.membership.role === 'AREA_MANAGER' ? { areaId: context.membership.areaId } : {}),
  }
  const where = {
    supplierId: supplier.id,
    ...(status ? { status } : {}),
    ...(q ? { batchCode: { contains: q, mode: 'insensitive' } } : {}),
    tank: tankWhere,
  }

  const [items, total] = await prisma.$transaction([
    prisma.seedBatch.findMany({
      where,
      include: { tank: { select: { id: true, code: true, name: true, areaId: true } } },
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.seedBatch.count({ where }),
  ])
  return { supplier: { id: supplier.id, name: supplier.name }, items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } }
}
