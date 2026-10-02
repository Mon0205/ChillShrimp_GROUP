import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { normalizeWaterParameterLogInput } from '../utils/water-parameter-log.validation.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DECIMAL_FIELDS = ['temperature', 'ph', 'salinity', 'dissolvedOxygen', 'nh3', 'tan', 'no2', 'nitrate', 'alkalinity', 'h2s', 'turbidity', 'waterLevelM']

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

function scopedTankWhere(req, extra = {}) {
  if (req.membership.role !== 'owner' && !req.membership.areaId) throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
  return {
    farmId: req.params.farmId,
    deletedAt: null,
    ...(req.membership.role === 'owner' ? {} : { areaId: req.membership.areaId }),
    ...extra,
  }
}

export async function listWaterParameterLogs(req, res) {
  const { page, limit, skip } = parsePagination(req.query)
  const tankId = req.query.tankId || null
  const from = parseDate(req.query.from, 'Ngày bắt đầu')
  const to = parseDate(req.query.to, 'Ngày kết thúc')
  if (tankId && !UUID_PATTERN.test(tankId)) throw createHttpError(400, 'Mã ao/bể không hợp lệ.')
  if (from && to && from > to) throw createHttpError(400, 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')
  const where = {
    tank: { is: scopedTankWhere(req, tankId ? { id: tankId } : {}) },
    ...(from || to ? { recordedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.waterParameterLog.findMany({
      where,
      include: {
        tank: { select: { id: true, code: true, name: true } },
        recorder: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.waterParameterLog.count({ where }),
  ])
  return sendData(res, { items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
}

export async function createWaterParameterLog(req, res) {
  let input
  try { input = normalizeWaterParameterLogInput(req.body) }
  catch (error) { throw createHttpError(400, error.message) }

  const tank = await prisma.pondTank.findFirst({
    where: scopedTankWhere(req, { id: input.tankId }),
    select: { id: true },
  })
  if (!tank) throw createHttpError(404, 'Không tìm thấy ao/bể trong phạm vi được cấp quyền.')

  const data = {
    tankId: tank.id,
    recordedBy: req.auth.id,
    measurementMethod: input.measurementMethod,
    measurementDevice: input.measurementDevice,
    recordedAt: input.recordedAt,
    notes: input.notes,
  }
  for (const field of DECIMAL_FIELDS) data[field] = input[field] === null ? null : new Prisma.Decimal(String(input[field]))

  const item = await prisma.waterParameterLog.create({
    data,
    include: {
      tank: { select: { id: true, code: true, name: true } },
      recorder: { select: { id: true, displayName: true, email: true } },
    },
  })
  return sendData(res, item, 201)
}
