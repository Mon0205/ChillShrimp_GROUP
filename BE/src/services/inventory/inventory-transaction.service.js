import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'
import { normalizeInventoryImportInput } from '../../utils/inventory-import.validation.js'
import { normalizeInventoryAdjustmentInput } from '../../utils/inventory-request.validation.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page)
  const limit = query.limit === undefined ? 50 : Number(query.limit)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createHttpError(400, 'Tham số page/limit không hợp lệ; limit phải từ 1 đến 100.')
  }
  return { page, limit, skip: (page - 1) * limit }
}

function parseDate(value, label) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw createHttpError(400, `${label} không hợp lệ.`)
  return date
}

function areaScope(operation) {
  if (['OWNER', 'FARM_MANAGER'].includes(operation.membership.role)) return {}
  if (!operation.membership.areaId) throw createHttpError(403, 'Technician chưa được gán khu vực.')
  return { areaId: operation.membership.areaId }
}

function serializeTransaction(transaction) {
  return {
    ...transaction,
    quantity: transaction.quantity.toString(),
    unitPrice: transaction.unitPrice.toString(),
  }
}

export async function listInventoryUsageTransactions(operation) {
  const { page, limit, skip } = parsePagination(operation.filters)
  const supplyId = operation.filters.supplyId || null
  const batchId = operation.filters.batchId || null
  const from = parseDate(operation.filters.from, 'Ngày bắt đầu')
  const to = parseDate(operation.filters.to, 'Ngày kết thúc')
  if (supplyId && !UUID_PATTERN.test(supplyId)) throw createHttpError(400, 'Mã vật tư không hợp lệ.')
  if (batchId && !UUID_PATTERN.test(batchId)) throw createHttpError(400, 'Mã lô giống không hợp lệ.')
  if (from && to && from > to) throw createHttpError(400, 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')

  const where = {
    transactionType: 'usage',
    supply: { is: { farmId: operation.farmId } },
    ...(supplyId ? { supplyId } : {}),
    ...(batchId ? { batchId } : {}),
    ...(from || to ? { transactionDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  }
  if (['TECHNICIAN', 'AREA_MANAGER'].includes(operation.membership.role)) {
    const scope = areaScope(operation)
    where.OR = [
      { supplyRequest: { is: { farmId: operation.farmId, ...scope } } },
      { supplyRequestId: null, batch: { is: { tank: { is: { farmId: operation.farmId, deletedAt: null, ...scope } } } } },
    ]
  }

  const [items, total] = await prisma.$transaction([
    prisma.inventoryTransaction.findMany({
      where,
      include: {
        supply: { select: { id: true, name: true, category: true, unit: true } },
        batch: { select: { id: true, batchCode: true, tank: { select: { id: true, code: true, name: true } } } },
        supplyRequest: { select: {
          id: true,
          area: { select: { id: true, name: true } },
          tank: { select: { id: true, code: true, name: true } },
          requester: { select: { id: true, displayName: true, email: true } },
        } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.inventoryTransaction.count({ where }),
  ])
  return { items: items.map(serializeTransaction), pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } }
}

export async function listInventoryImports(operation) {
  const { page, limit, skip } = parsePagination(operation.filters)
  const supplyId = operation.filters.supplyId || null
  const from = parseDate(operation.filters.from, 'Start date')
  const to = parseDate(operation.filters.to, 'End date')
  if (supplyId && !UUID_PATTERN.test(supplyId)) throw createHttpError(400, 'Supply id is invalid.')
  if (from && to && from > to) throw createHttpError(400, 'Start date must be on or before end date.')

  const where = {
    transactionType: 'import',
    supply: { is: { farmId: operation.farmId } },
    ...(supplyId ? { supplyId } : {}),
    ...(from || to ? { transactionDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.inventoryTransaction.findMany({
      where,
      include: {
        supply: { select: { id: true, name: true, category: true, unit: true } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.inventoryTransaction.count({ where }),
  ])
  return { items: items.map(serializeTransaction), pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } }
}

export async function recordInventoryImport(operation) {
  let input
  try { input = normalizeInventoryImportInput(operation.input) }
  catch (error) { throw createHttpError(400, error.message) }

  const farmId = operation.farmId
  const quantity = new Prisma.Decimal(String(input.quantity))
  const unitPrice = new Prisma.Decimal(String(input.unitPrice))
  const transaction = await prisma.$transaction(async (tx) => {
    const lockedSupply = await tx.$queryRaw(Prisma.sql`
      SELECT "id" FROM "inventory_supplies"
      WHERE "id" = CAST(${input.supplyId} AS UUID)
        AND "farm_id" = CAST(${farmId} AS UUID)
      FOR UPDATE
    `)
    if (!lockedSupply.length) throw createHttpError(404, 'Supply was not found in this farm.')

    const supply = await tx.inventorySupply.findFirst({ where: { id: input.supplyId, farmId } })
    if (!supply) throw createHttpError(404, 'Supply was not found in this farm.')

    const stockUpdate = await tx.inventorySupply.updateMany({
      where: { id: supply.id, farmId },
      data: { quantity: { increment: quantity }, unitPrice },
    })
    if (!stockUpdate.count) throw createHttpError(409, 'Stock changed while importing. Reload and try again.')

    return tx.inventoryTransaction.create({
      data: {
        supplyId: supply.id,
        createdBy: operation.actor.id,
        transactionType: 'import',
        quantity,
        unitPrice,
        transactionDate: input.transactionDate,
        notes: input.notes,
      },
      include: {
        supply: { select: { id: true, name: true, category: true, unit: true } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
    })
  })

  return serializeTransaction(transaction)
}

export async function listInventoryAdjustments(operation) {
  const { page, limit, skip } = parsePagination(operation.filters)
  const supplyId = operation.filters.supplyId || null
  const from = parseDate(operation.filters.from, 'NgÃ y báº¯t Ä‘áº§u')
  const to = parseDate(operation.filters.to, 'NgÃ y káº¿t thÃºc')
  if (supplyId && !UUID_PATTERN.test(supplyId)) throw createHttpError(400, 'MÃ£ váº­t tÆ° khÃ´ng há»£p lá»‡.')
  if (from && to && from > to) throw createHttpError(400, 'NgÃ y báº¯t Ä‘áº§u pháº£i trÆ°á»›c hoáº·c báº±ng ngÃ y káº¿t thÃºc.')
  const where = {
    transactionType: 'adjustment',
    supply: { is: { farmId: operation.farmId } },
    ...(supplyId ? { supplyId } : {}),
    ...(from || to ? { transactionDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.inventoryTransaction.findMany({
      where,
      include: {
        supply: { select: { id: true, name: true, category: true, unit: true } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.inventoryTransaction.count({ where }),
  ])
  return { items: items.map(serializeTransaction), pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } }
}

export async function recordInventoryAdjustment(operation) {
  let input
  try { input = normalizeInventoryAdjustmentInput(operation.input) }
  catch (error) { throw createHttpError(400, error.message) }
  const farmId = operation.farmId
  const delta = new Prisma.Decimal(String(input.quantity))
  const amount = delta.abs()
  const transaction = await prisma.$transaction(async (tx) => {
    const lockedSupply = await tx.$queryRaw(Prisma.sql`
      SELECT "id" FROM "inventory_supplies"
      WHERE "id" = CAST(${input.supplyId} AS UUID)
        AND "farm_id" = CAST(${farmId} AS UUID)
      FOR UPDATE
    `)
    if (!lockedSupply.length) throw createHttpError(404, 'KhÃ´ng tÃ¬m tháº¥y váº­t tÆ° trong trang tráº¡i.')
    const supply = await tx.inventorySupply.findFirst({ where: { id: input.supplyId, farmId } })
    if (!supply) throw createHttpError(404, 'KhÃ´ng tÃ¬m tháº¥y váº­t tÆ° trong trang tráº¡i.')
    if (delta.lessThan(0) && supply.quantity.lessThan(amount)) throw createHttpError(409, 'Äiá»u chá»‰nh sáº½ lÃ m tá»“n kho Ã¢m.')
    if (delta.greaterThan(0) && supply.quantity.plus(amount).greaterThan('999999999.999')) throw createHttpError(409, 'Äiá»u chá»‰nh vÆ°á»£t quÃ¡ giá»›i háº¡n tá»“n kho.')

    const stockUpdate = await tx.inventorySupply.updateMany({
      where: { id: supply.id, farmId, ...(delta.lessThan(0) ? { quantity: { gte: amount } } : {}) },
      data: { quantity: delta.greaterThan(0) ? { increment: amount } : { decrement: amount } },
    })
    if (!stockUpdate.count) throw createHttpError(409, 'Tá»“n kho vá»«a thay Ä‘á»•i; táº£i láº¡i dá»¯ liá»‡u rá»“i thá»­ láº¡i.')

    return tx.inventoryTransaction.create({
      data: {
        supplyId: supply.id,
        createdBy: operation.actor.id,
        transactionType: 'adjustment',
        quantity: delta,
        unitPrice: supply.unitPrice,
        transactionDate: input.transactionDate,
        notes: input.reason,
      },
      include: {
        supply: { select: { id: true, name: true, category: true, unit: true } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
    })
  })
  return serializeTransaction(transaction)
}
