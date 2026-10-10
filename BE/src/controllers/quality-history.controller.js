import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

export function listQualityHistory(kind) {
  return async (req, res) => {
    const page = Number(req.query.page || 1), limit = Number(req.query.limit || 10)
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw createHttpError(400, 'Phân trang không hợp lệ.')
    const scoped = req.membership.role !== 'owner'
    if (scoped && !req.membership.areaId) throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    for (const key of ['batchId', 'tankId']) if (req.query[key] && !uuid.test(req.query[key])) throw createHttpError(400, 'Mã lô hoặc ao/bể không hợp lệ.')
    const tank = { farmId: req.params.farmId, ...(scoped ? { areaId: req.membership.areaId } : {}), ...(req.query.tankId ? { id: req.query.tankId } : {}) }
    const where = { batch: { ...(req.query.batchId ? { id: req.query.batchId } : {}), tank } }
    const range = {}
    for (const [key, bound] of [['from', 'gte'], ['to', 'lte']]) {
      if (!req.query[key]) continue
      const date = new Date(req.query[key])
      if (Number.isNaN(date.getTime())) throw createHttpError(400, 'Khoảng ngày không hợp lệ.')
      range[bound] = date
    }
    const timestamp = kind === 'checks' ? 'checkedAt' : 'createdAt'
    if (Object.keys(range).length) where[timestamp] = range
    const delegate = kind === 'checks' ? prisma.seedQualityCheck : prisma.aiInspection
    const include = {
      batch: { select: { id: true, batchCode: true, status: true, tank: { select: { id: true, code: true, name: true } } } },
      ...(kind === 'checks' ? { checker: { select: { id: true, displayName: true, email: true } }, reviewer: { select: { id: true, displayName: true } } } : { creator: { select: { id: true, displayName: true } } }),
    }
    const [items, total] = await prisma.$transaction([
      delegate.findMany({ where, include, orderBy: [{ [timestamp]: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      delegate.count({ where }),
    ])
    return sendData(res, { items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
  }
}
