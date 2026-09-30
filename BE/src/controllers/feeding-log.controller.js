import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { normalizeFeedingLogInput } from '../utils/feeding-log.validation.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function scopedTankWhere(req, extra = {}) {
  if (req.membership.role !== 'owner' && !req.membership.areaId) {
    throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
  }
  return {
    farmId: req.params.farmId,
    deletedAt: null,
    ...(req.membership.role === 'owner' ? {} : { areaId: req.membership.areaId }),
    ...extra,
  }
}

function parseUuid(value, label) {
  if (!UUID_PATTERN.test(value || '')) throw createHttpError(400, `${label} không hợp lệ.`)
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

function asDecimal(value) {
  return value === null ? null : new Prisma.Decimal(String(value))
}

export async function listFeedingLogs(req, res) {
  const { farmId } = req.params
  const { page, limit, skip } = parsePagination(req.query)
  const tankId = req.query.tankId
  const from = parseDate(req.query.from, 'Ngày bắt đầu')
  const to = parseDate(req.query.to, 'Ngày kết thúc')
  if (from && to && from > to) throw createHttpError(400, 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')

  const where = {
    tank: { is: scopedTankWhere(req, tankId ? { id: tankId } : {}) },
    ...(from || to ? { feedingTime: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  }
  if (tankId) parseUuid(tankId, 'Mã ao/bể')

  const [items, total, totalsByUnit, average] = await prisma.$transaction([
    prisma.feedingLog.findMany({
      where,
      include: {
        tank: { select: { id: true, code: true, name: true } },
        performer: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ feedingTime: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.feedingLog.count({ where }),
    prisma.feedingLog.groupBy({ by: ['unit'], where, _sum: { amount: true, recommendedAmount: true } }),
    prisma.feedingLog.aggregate({ where, _avg: { feedingRatePercent: true } }),
  ])

  return sendData(res, {
    items,
    pagination: { page, limit, total, pageCount: Math.ceil(total / limit) },
    summary: {
      amountsByUnit: totalsByUnit.map((item) => ({
        unit: item.unit,
        actualAmount: item._sum.amount?.toString() || '0',
        recommendedAmount: item._sum.recommendedAmount?.toString() || '0',
      })),
      averageFeedingRatePercent: average._avg.feedingRatePercent?.toString() || null,
    },
  })
}

export async function createFeedingLog(req, res) {
  parseUuid(req.body.tankId, 'Mã ao/bể')
  let normalized
  try {
    normalized = normalizeFeedingLogInput(req.body)
  } catch (error) {
    throw createHttpError(400, error.message)
  }

  const tank = await prisma.pondTank.findFirst({
    where: scopedTankWhere(req, { id: req.body.tankId, status: 'active' }),
    select: { id: true },
  })
  if (!tank) throw createHttpError(404, 'Không tìm thấy ao/bể đang hoạt động trong phạm vi được cấp quyền.')

  const log = await prisma.feedingLog.create({
    data: {
      tankId: tank.id,
      performedBy: req.auth.id,
      feedName: normalized.feedName,
      amount: asDecimal(normalized.amount),
      unit: normalized.unit,
      biomassSnapshotKg: asDecimal(normalized.biomassSnapshotKg),
      feedingRatePercent: asDecimal(normalized.feedingRatePercent),
      recommendedAmount: asDecimal(normalized.recommendedAmount),
      feedCheckStatus: normalized.feedCheckStatus,
      feedingTime: normalized.feedingTime,
      notes: normalized.notes,
    },
    include: {
      tank: { select: { id: true, code: true, name: true } },
      performer: { select: { id: true, displayName: true, email: true } },
    },
  })
  return sendData(res, log, 201)
}
