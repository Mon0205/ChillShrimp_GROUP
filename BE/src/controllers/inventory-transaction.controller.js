import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { normalizeInventoryUsageInput } from '../utils/inventory-usage.validation.js'

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

function areaScope(req) {
  if (req.membership.role === 'owner') return {}
  if (!req.membership.areaId) throw createHttpError(403, 'Technician chưa được gán khu vực.')
  return { areaId: req.membership.areaId }
}

function serializeTransaction(transaction) {
  return {
    ...transaction,
    quantity: transaction.quantity.toString(),
    unitPrice: transaction.unitPrice.toString(),
  }
}

export async function listInventoryUsageTransactions(req, res) {
  const { page, limit, skip } = parsePagination(req.query)
  const supplyId = req.query.supplyId || null
  const batchId = req.query.batchId || null
  const from = parseDate(req.query.from, 'Ngày bắt đầu')
  const to = parseDate(req.query.to, 'Ngày kết thúc')
  if (supplyId && !UUID_PATTERN.test(supplyId)) throw createHttpError(400, 'Mã vật tư không hợp lệ.')
  if (batchId && !UUID_PATTERN.test(batchId)) throw createHttpError(400, 'Mã lô giống không hợp lệ.')
  if (from && to && from > to) throw createHttpError(400, 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')

  const where = {
    transactionType: 'usage',
    supply: { is: { farmId: req.params.farmId } },
    ...(supplyId ? { supplyId } : {}),
    ...(batchId ? { batchId } : {}),
    ...(from || to ? { transactionDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  }
  if (req.membership.role === 'technician') {
    where.batch = { is: { tank: { is: { farmId: req.params.farmId, deletedAt: null, ...areaScope(req) } } } }
  }

  const [items, total] = await prisma.$transaction([
    prisma.inventoryTransaction.findMany({
      where,
      include: {
        supply: { select: { id: true, name: true, category: true, unit: true } },
        batch: { select: { id: true, batchCode: true, tank: { select: { id: true, code: true, name: true } } } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.inventoryTransaction.count({ where }),
  ])
  return sendData(res, { items: items.map(serializeTransaction), pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
}

export async function recordInventoryUsage(req, res) {
  let input
  try { input = normalizeInventoryUsageInput(req.body) }
  catch (error) { throw createHttpError(400, error.message) }
  const farmId = req.params.farmId
  const technicianScope = areaScope(req)
  if (req.membership.role === 'technician' && !input.batchId) {
    throw createHttpError(400, 'Technician phải liên kết vật tư sử dụng với lô đang nuôi trong khu vực được phân công.')
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const lockedSupply = await tx.$queryRaw(Prisma.sql`
      SELECT "id" FROM "inventory_supplies"
      WHERE "id" = CAST(${input.supplyId} AS UUID)
        AND "farm_id" = CAST(${farmId} AS UUID)
      FOR UPDATE
    `)
    if (!lockedSupply.length) throw createHttpError(404, 'Không tìm thấy vật tư trong trang trại.')

    const supply = await tx.inventorySupply.findFirst({ where: { id: input.supplyId, farmId } })
    let batch = null
    if (input.batchId) {
      batch = await tx.seedBatch.findFirst({
        where: {
          id: input.batchId,
          status: { in: ['active', 'ready_for_sale'] },
          tank: { is: { farmId, deletedAt: null, ...technicianScope } },
        },
        select: { id: true },
      })
      if (!batch) throw createHttpError(404, 'Không tìm thấy lô đang nuôi trong trang trại/khu vực được cấp quyền.')
    }
    if (supply.quantity.lessThan(input.quantity)) throw createHttpError(409, 'Tồn kho không đủ cho lượng sử dụng đã nhập.')

    const stockUpdate = await tx.inventorySupply.updateMany({
      where: { id: supply.id, farmId, quantity: { gte: new Prisma.Decimal(String(input.quantity)) } },
      data: { quantity: { decrement: new Prisma.Decimal(String(input.quantity)) } },
    })
    if (!stockUpdate.count) throw createHttpError(409, 'Tồn kho vừa thay đổi; tải lại dữ liệu rồi thử lại.')

    return tx.inventoryTransaction.create({
      data: {
        supplyId: supply.id,
        batchId: batch?.id || null,
        createdBy: req.auth.id,
        transactionType: 'usage',
        quantity: new Prisma.Decimal(String(input.quantity)),
        unitPrice: supply.unitPrice,
        transactionDate: input.transactionDate,
        notes: input.notes,
      },
      include: {
        supply: { select: { id: true, name: true, category: true, unit: true } },
        batch: { select: { id: true, batchCode: true, tank: { select: { id: true, code: true, name: true } } } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
    })
  })

  return sendData(res, serializeTransaction(transaction), 201)
}
