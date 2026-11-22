import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'
import { withLowConfidenceRatio } from './ai-inspection.service.js'

// Real accuracy of the AI count: only inspections where a person confirmed a count (manualCount > 0).
// Error is relative to the confirmed count; bias < 0 means the AI under-counts.
export function summarizeAccuracy(rows) {
  const errors = rows.map(({ detectedCount, manualCount }) => (detectedCount - manualCount) / manualCount)
  const n = errors.length
  if (!n) return { confirmedCount: 0, meanAbsError: null, withinTenPercentRatio: null, bias: null }
  const round = (value) => Number(value.toFixed(4))
  return {
    confirmedCount: n,
    meanAbsError: round(errors.reduce((sum, error) => sum + Math.abs(error), 0) / n),
    withinTenPercentRatio: round(errors.filter((error) => Math.abs(error) < 0.1).length / n),
    bias: round(errors.reduce((sum, error) => sum + error, 0) / n),
  }
}

const INSPECTION_STATUSES = ['pending', 'processing', 'completed', 'failed']

export async function listQualityHistory(context) {
    const page = Number(context.filters.page || 1), limit = Number(context.filters.limit || 10)
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw createHttpError(400, 'Phân trang không hợp lệ.')
    const scoped = !['OWNER', 'FARM_MANAGER'].includes(context.membership.role)
    if (scoped && !context.membership.areaId) throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    for (const key of ['batchId', 'tankId']) if (context.filters[key] && !uuid.test(context.filters[key])) throw createHttpError(400, 'Mã lô hoặc ao/bể không hợp lệ.')
    const tank = { farmId: context.farmId, ...(scoped ? { areaId: context.membership.areaId } : {}), ...(context.filters.tankId ? { id: context.filters.tankId } : {}) }
    const where = { batch: { ...(context.filters.batchId ? { id: context.filters.batchId } : {}), tank } }
    // "status" takes one or more comma-separated values; "mine=true" keeps only inspections the caller created.
    if (context.filters.status !== undefined && context.filters.status !== '') {
      const statuses = String(context.filters.status).split(',').map((value) => value.trim())
      if (!statuses.length || statuses.some((value) => !INSPECTION_STATUSES.includes(value))) throw createHttpError(400, 'Trạng thái kiểm tra AI không hợp lệ.')
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses }
    }
    if (context.filters.mine !== undefined && context.filters.mine !== '') {
      if (!['true', 'false'].includes(context.filters.mine)) throw createHttpError(400, 'mine phải là true hoặc false.')
      if (context.filters.mine === 'true') where.createdBy = context.actor.id
    }
    const range = {}
    for (const [key, bound] of [['from', 'gte'], ['to', 'lte']]) {
      if (!context.filters[key]) continue
      const date = new Date(context.filters[key])
      if (Number.isNaN(date.getTime())) throw createHttpError(400, 'Khoảng ngày không hợp lệ.')
      range[bound] = date
    }
    const timestamp = 'createdAt'
    if (Object.keys(range).length) where[timestamp] = range
    const delegate = prisma.aiInspection
    const include = {
      batch: { select: { id: true, batchCode: true, status: true, tank: { select: { id: true, code: true, name: true } } } },
      creator: { select: { id: true, displayName: true } },
    }
    const [items, total, confirmed] = await prisma.$transaction([
      delegate.findMany({ where, include, orderBy: [{ [timestamp]: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      delegate.count({ where }),
      delegate.findMany({ where: { ...where, status: 'completed', detectedCount: { not: null }, manualCount: { gt: 0 } }, select: { detectedCount: true, manualCount: true } }),
    ])
    return { items: items.map(withLowConfidenceRatio), accuracy: summarizeAccuracy(confirmed), pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } }
}
