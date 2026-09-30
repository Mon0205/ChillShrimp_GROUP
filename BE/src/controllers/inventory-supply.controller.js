import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { INVENTORY_CATEGORIES, normalizeInventorySupplyInput } from '../utils/inventory-supply.validation.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page)
  const limit = query.limit === undefined ? 50 : Number(query.limit)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createHttpError(400, 'Tham số page/limit không hợp lệ; limit phải từ 1 đến 100.')
  }
  return { page, limit, skip: (page - 1) * limit }
}

function serializeSupply(supply) {
  return {
    ...supply,
    quantity: supply.quantity.toString(),
    unitPrice: supply.unitPrice.toString(),
    minThreshold: supply.minThreshold.toString(),
    isBelowThreshold: supply.quantity.lessThan(supply.minThreshold),
  }
}

function parseInput(body, options) {
  try {
    return normalizeInventorySupplyInput(body, options)
  } catch (error) {
    throw createHttpError(400, error.message)
  }
}

function toDecimal(value) {
  return new Prisma.Decimal(String(value))
}

export async function listInventorySupplies(req, res) {
  const { page, limit, skip } = parsePagination(req.query)
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const category = req.query.category || ''
  const lowStock = req.query.lowStock || 'false'
  if (q.length > 150) throw createHttpError(400, 'Từ khóa tìm kiếm tối đa 150 ký tự.')
  if (category && !INVENTORY_CATEGORIES.includes(category)) throw createHttpError(400, 'Loại vật tư không hợp lệ.')
  if (!['true', 'false'].includes(lowStock)) throw createHttpError(400, 'Bộ lọc dưới ngưỡng không hợp lệ.')

  const conditions = [Prisma.sql`"farm_id" = CAST(${req.params.farmId} AS UUID)`]
  if (q) conditions.push(Prisma.sql`"name" ILIKE ${`%${q}%`}`)
  if (category) conditions.push(Prisma.sql`"category" = ${category}`)
  if (lowStock === 'true') conditions.push(Prisma.sql`"quantity" < "min_threshold"`)
  const where = Prisma.join(conditions, ' AND ')
  const [rows, countRows] = await prisma.$transaction([
    prisma.$queryRaw(Prisma.sql`
      SELECT "id", "farm_id" AS "farmId", "name", "category", "unit", "quantity",
        "unit_price" AS "unitPrice", "min_threshold" AS "minThreshold", "description",
        "created_at" AS "createdAt", "updated_at" AS "updatedAt"
      FROM "inventory_supplies" WHERE ${where}
      ORDER BY "name" ASC LIMIT ${limit} OFFSET ${skip}
    `),
    prisma.$queryRaw(Prisma.sql`SELECT COUNT(*)::integer AS "total" FROM "inventory_supplies" WHERE ${where}`),
  ])
  const items = rows.map(serializeSupply)
  const total = countRows[0]?.total || 0
  return sendData(res, { items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
}

export async function getInventorySupply(req, res) {
  if (!UUID_PATTERN.test(req.params.supplyId || '')) throw createHttpError(400, 'Mã vật tư không hợp lệ.')
  const supply = await prisma.inventorySupply.findFirst({ where: { id: req.params.supplyId, farmId: req.params.farmId } })
  if (!supply) throw createHttpError(404, 'Không tìm thấy vật tư trong trang trại.')
  return sendData(res, serializeSupply(supply))
}

export async function createInventorySupply(req, res) {
  const input = parseInput(req.body, { partial: false })
  const supply = await prisma.inventorySupply.create({
    data: {
      ...input,
      farmId: req.params.farmId,
      quantity: new Prisma.Decimal(0),
      unitPrice: toDecimal(input.unitPrice),
      minThreshold: toDecimal(input.minThreshold),
    },
  })
  return sendData(res, serializeSupply(supply), 201)
}

export async function updateInventorySupply(req, res) {
  if (!UUID_PATTERN.test(req.params.supplyId || '')) throw createHttpError(400, 'Mã vật tư không hợp lệ.')
  const existing = await prisma.inventorySupply.findFirst({ where: { id: req.params.supplyId, farmId: req.params.farmId } })
  if (!existing) throw createHttpError(404, 'Không tìm thấy vật tư trong trang trại.')
  const input = parseInput(req.body, { partial: true })
  if (input.unitPrice !== undefined) input.unitPrice = toDecimal(input.unitPrice)
  if (input.minThreshold !== undefined) input.minThreshold = toDecimal(input.minThreshold)
  const supply = await prisma.inventorySupply.update({ where: { id: existing.id }, data: input })
  return sendData(res, serializeSupply(supply))
}
