import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'
import { normalizeWaterChangeLogInput } from '../../utils/water-change-log.validation.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

function scopedTankWhere(operation, extra = {}) {
  if (!['owner', 'farm_manager'].includes(operation.membership.role) && !operation.membership.areaId) {
    throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
  }
  return {
    farmId: operation.farmId,
    deletedAt: null,
    ...(['owner', 'farm_manager'].includes(operation.membership.role) ? {} : { areaId: operation.membership.areaId }),
    ...extra,
  }
}

function parseInput(body) {
  try {
    return normalizeWaterChangeLogInput(body)
  } catch (error) {
    throw createHttpError(400, error.message)
  }
}

export async function listWaterChangeLogs(operation) {
  const { page, limit, skip } = parsePagination(operation.filters)
  const tankId = operation.filters.tankId || null
  const from = parseDate(operation.filters.from, 'Ngày bắt đầu')
  const to = parseDate(operation.filters.to, 'Ngày kết thúc')
  if (tankId && !UUID_PATTERN.test(tankId)) throw createHttpError(400, 'Mã ao/bể không hợp lệ.')
  if (from && to && from > to) throw createHttpError(400, 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')

  const where = {
    tank: { is: scopedTankWhere(operation, tankId ? { id: tankId } : {}) },
    ...(from || to ? { performedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  }
  const [items, total, average] = await prisma.$transaction([
    prisma.waterChangeLog.findMany({
      where,
      include: {
        tank: { select: { id: true, code: true, name: true } },
        performer: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ performedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.waterChangeLog.count({ where }),
    prisma.waterChangeLog.aggregate({ where, _avg: { waterChangePercentage: true } }),
  ])

  return {
    items,
    pagination: { page, limit, total, pageCount: Math.ceil(total / limit) },
    summary: { averageWaterChangePercentage: average._avg.waterChangePercentage?.toString() || null },
  }
}

export async function createWaterChangeLog(operation) {
  const input = parseInput(operation.input)
  const tank = await prisma.pondTank.findFirst({
    where: scopedTankWhere(operation, { id: input.tankId }),
    select: { id: true },
  })
  if (!tank) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền.')

  const item = await prisma.waterChangeLog.create({
    data: {
      tankId: tank.id,
      performedBy: operation.actor.id,
      waterChangePercentage: new Prisma.Decimal(String(input.waterChangePercentage)),
      performedAt: input.performedAt,
      notes: input.notes,
    },
    include: {
      tank: { select: { id: true, code: true, name: true } },
      performer: { select: { id: true, displayName: true, email: true } },
    },
  })
  return item
}
