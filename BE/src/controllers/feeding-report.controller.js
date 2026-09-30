import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { parseFeedingReportFilters } from '../utils/feeding-report.validation.js'

function decimalString(value) {
  return value === null || value === undefined ? null : value.toString()
}

function reportWhere(req, filters) {
  if (req.membership.role !== 'owner' && !req.membership.areaId) {
    throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
  }
  const conditions = [
    Prisma.sql`t."farm_id" = CAST(${req.params.farmId} AS UUID)`,
    Prisma.sql`l."feeding_time" >= CAST(${filters.from} AS TIMESTAMPTZ)`,
    Prisma.sql`l."feeding_time" <= CAST(${filters.to} AS TIMESTAMPTZ)`,
  ]
  if (req.membership.role !== 'owner') conditions.push(Prisma.sql`t."area_id" = CAST(${req.membership.areaId} AS UUID)`)
  if (filters.tankId) conditions.push(Prisma.sql`t."id" = CAST(${filters.tankId} AS UUID)`)
  return Prisma.join(conditions, ' AND ')
}

export async function getFeedingReport(req, res) {
  let filters
  try {
    filters = parseFeedingReportFilters(req.query)
  } catch (error) {
    throw createHttpError(400, error.message)
  }
  const where = reportWhere(req, filters)

  const [unitRows, tankRows, dailyRows, recentRows] = await prisma.$transaction([
    prisma.$queryRaw(Prisma.sql`
      SELECT l."unit",
        SUM(l."amount") AS "actualAmount",
        SUM(l."recommended_amount") AS "recommendedAmount",
        SUM(CASE WHEN l."recommended_amount" IS NOT NULL THEN l."amount" - l."recommended_amount" END) AS "variance",
        COUNT(*)::integer AS "feedingCount",
        COUNT(l."recommended_amount")::integer AS "comparableCount",
        AVG(l."feeding_rate_percent") AS "averageRatePercent"
      FROM "feeding_logs" l JOIN "ponds_tanks" t ON t."id" = l."tank_id"
      WHERE ${where}
      GROUP BY l."unit" ORDER BY l."unit"
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT t."id" AS "tankId", t."code" AS "tankCode", t."name" AS "tankName", l."unit",
        SUM(l."amount") AS "actualAmount",
        SUM(l."recommended_amount") AS "recommendedAmount",
        SUM(CASE WHEN l."recommended_amount" IS NOT NULL THEN l."amount" - l."recommended_amount" END) AS "variance",
        COUNT(*)::integer AS "feedingCount",
        COUNT(l."recommended_amount")::integer AS "comparableCount"
      FROM "feeding_logs" l JOIN "ponds_tanks" t ON t."id" = l."tank_id"
      WHERE ${where}
      GROUP BY t."id", t."code", t."name", l."unit"
      ORDER BY t."code", l."unit"
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT TO_CHAR(DATE_TRUNC('day', l."feeding_time" AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS "date",
        l."unit", SUM(l."amount") AS "actualAmount", SUM(l."recommended_amount") AS "recommendedAmount",
        SUM(CASE WHEN l."recommended_amount" IS NOT NULL THEN l."amount" - l."recommended_amount" END) AS "variance",
        COUNT(*)::integer AS "feedingCount", COUNT(l."recommended_amount")::integer AS "comparableCount"
      FROM "feeding_logs" l JOIN "ponds_tanks" t ON t."id" = l."tank_id"
      WHERE ${where}
      GROUP BY DATE_TRUNC('day', l."feeding_time" AT TIME ZONE 'Asia/Ho_Chi_Minh'), l."unit"
      ORDER BY DATE_TRUNC('day', l."feeding_time" AT TIME ZONE 'Asia/Ho_Chi_Minh'), l."unit"
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT l."id", l."feeding_time" AS "feedingTime", l."feed_name" AS "feedName",
        l."amount", l."unit", l."recommended_amount" AS "recommendedAmount",
        l."feed_check_status" AS "feedCheckStatus", t."code" AS "tankCode", t."name" AS "tankName"
      FROM "feeding_logs" l JOIN "ponds_tanks" t ON t."id" = l."tank_id"
      WHERE ${where}
      ORDER BY l."feeding_time" DESC, l."created_at" DESC LIMIT 12
    `),
  ])

  const summary = unitRows.map((row) => ({
    unit: row.unit,
    actualAmount: decimalString(row.actualAmount) || '0',
    recommendedAmount: decimalString(row.recommendedAmount),
    variance: decimalString(row.variance),
    feedingCount: row.feedingCount,
    comparableCount: row.comparableCount,
    averageRatePercent: decimalString(row.averageRatePercent),
  }))
  const byTank = tankRows.map((row) => ({
    tankId: row.tankId,
    tankCode: row.tankCode,
    tankName: row.tankName,
    unit: row.unit,
    actualAmount: decimalString(row.actualAmount) || '0',
    recommendedAmount: decimalString(row.recommendedAmount),
    variance: decimalString(row.variance),
    feedingCount: row.feedingCount,
    comparableCount: row.comparableCount,
  }))
  const daily = dailyRows.map((row) => ({
    date: row.date,
    unit: row.unit,
    actualAmount: decimalString(row.actualAmount) || '0',
    recommendedAmount: decimalString(row.recommendedAmount),
    variance: decimalString(row.variance),
    feedingCount: row.feedingCount,
    comparableCount: row.comparableCount,
  }))
  const recent = recentRows.map((row) => ({
    ...row,
    amount: decimalString(row.amount),
    recommendedAmount: decimalString(row.recommendedAmount),
  }))

  return sendData(res, {
    range: { from: filters.from.toISOString(), to: filters.to.toISOString() },
    filters: { tankId: filters.tankId },
    totalFeedings: summary.reduce((total, row) => total + row.feedingCount, 0),
    amountsByUnit: summary,
    byTank,
    daily,
    recent,
  })
}
