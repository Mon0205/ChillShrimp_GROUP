import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { normalizeTreatmentLogInput } from '../utils/treatment-log.validation.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STOCK_CATEGORIES = ['medicine', 'chemical', 'probiotic']

function scopedTankWhere(req, extra = {}) {
  if (req.membership.role !== 'owner' && !req.membership.areaId) throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
  return {
    farmId: req.params.farmId,
    deletedAt: null,
    ...(req.membership.role === 'owner' ? {} : { areaId: req.membership.areaId }),
    ...extra,
  }
}

function parseDate(value, label) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw createHttpError(400, `${label} không hợp lệ.`)
  return date
}

function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page)
  const limit = query.limit === undefined ? 50 : Number(query.limit)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createHttpError(400, 'Tham số page/limit không hợp lệ; limit phải từ 1 đến 100.')
  }
  return { page, limit, skip: (page - 1) * limit }
}

export async function listTreatmentLogs(req, res) {
  const { page, limit, skip } = parsePagination(req.query)
  const tankId = req.query.tankId || null
  const from = parseDate(req.query.from, 'Ngày bắt đầu')
  const to = parseDate(req.query.to, 'Ngày kết thúc')
  if (tankId && !UUID_PATTERN.test(tankId)) throw createHttpError(400, 'Mã ao/bể không hợp lệ.')
  if (from && to && from > to) throw createHttpError(400, 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')

  const where = {
    tank: { is: scopedTankWhere(req, tankId ? { id: tankId } : {}) },
    ...(from || to ? { performedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.treatmentLog.findMany({
      where,
      include: {
        tank: { select: { id: true, code: true, name: true } },
        performer: { select: { id: true, displayName: true, email: true } },
        supply: { select: { id: true, name: true, category: true, unit: true } },
      },
      orderBy: [{ performedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.treatmentLog.count({ where }),
  ])
  return sendData(res, { items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
}

export async function createTreatmentLog(req, res) {
  let input
  try { input = normalizeTreatmentLogInput(req.body) }
  catch (error) { throw createHttpError(400, error.message) }

  const { farmId } = req.params
  const tank = await prisma.pondTank.findFirst({
    where: scopedTankWhere(req, { id: input.tankId }),
    select: { id: true },
  })
  if (!tank) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền.')

  const amount = new Prisma.Decimal(String(input.amount))
  const log = await prisma.$transaction(async (tx) => {
    let supply = null
    if (input.supplyId) {
      await tx.$queryRaw`SELECT id FROM inventory_supplies WHERE id = ${input.supplyId}::uuid FOR UPDATE`
      supply = await tx.inventorySupply.findFirst({
        where: { id: input.supplyId, farmId, category: { in: STOCK_CATEGORIES } },
      })
      if (!supply) throw createHttpError(404, 'Không tìm thấy thuốc/chế phẩm trong danh mục vật tư của trang trại.')
      if (supply.unit.trim().toLowerCase() !== input.unit.trim().toLowerCase()) {
        throw createHttpError(400, `Đơn vị ghi nhận phải khớp với đơn vị tồn kho (${supply.unit}).`)
      }
      if (supply.quantity.lessThan(amount)) throw createHttpError(409, 'Tồn kho không đủ cho liều lượng đã nhập.')
    }

    const created = await tx.treatmentLog.create({
      data: {
        tankId: tank.id,
        performedBy: req.auth.id,
        supplyId: supply?.id || null,
        productName: supply?.name || input.productName,
        amount,
        unit: supply?.unit || input.unit,
        purpose: input.purpose,
        performedAt: input.performedAt,
        notes: input.notes,
      },
      include: {
        tank: { select: { id: true, code: true, name: true } },
        performer: { select: { id: true, displayName: true, email: true } },
        supply: { select: { id: true, name: true, category: true, unit: true } },
      },
    })

    if (supply) {
      const stockUpdate = await tx.inventorySupply.updateMany({
        where: { id: supply.id, farmId, quantity: { gte: amount } },
        data: { quantity: { decrement: amount } },
      })
      if (!stockUpdate.count) throw createHttpError(409, 'Tồn kho vừa thay đổi; tải lại dữ liệu rồi thử lại.')

      const batch = await tx.seedBatch.findFirst({
        where: { tankId: tank.id, status: { in: ['active', 'ready_for_sale'] } },
        orderBy: { stockedDate: 'desc' },
        select: { id: true },
      })
      await tx.inventoryTransaction.create({
        data: {
          supplyId: supply.id,
          batchId: batch?.id || null,
          createdBy: req.auth.id,
          transactionType: 'usage',
          quantity: amount,
          unitPrice: supply.unitPrice,
          transactionDate: input.performedAt,
          notes: `Sử dụng theo nhật ký thuốc/chế phẩm ${created.id}`,
        },
      })
    }
    return created
  })
  return sendData(res, log, 201)
}
