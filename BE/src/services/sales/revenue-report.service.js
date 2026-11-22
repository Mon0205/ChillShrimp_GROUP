import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'

// Revenue = delivered revenue: delivered quantity × the order line's unit price, counted in the month
// of the delivery. Order value = confirmed orders' totals, in the month of confirmation. Collected =
// payments, in the month they were recorded. Months follow Vietnam time.
// Definitions: docs/superpowers/specs/2026-11-21-revenue-report-design.md.
// The dashboard uses getRevenueSummary; the Revenue tab adds the per-lot table and the combined view.

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000 // Vietnam has no daylight saving time
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
export const MAX_MONTHS = 24
export const DEFAULT_REPORT_MONTHS = 6
const OPEN_ORDER_STATUSES = ['confirmed', 'partially_delivered', 'delivered']
// Draft orders were never confirmed and cancelled ones were withdrawn: neither has an order value.
const NOT_ORDER_VALUE_STATUSES = ['draft', 'cancelled']
const REPORT_ROLES = ['OWNER', 'FARM_MANAGER']

const monthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`

export function parseMonth(value, label = 'Tháng') {
  const match = typeof value === 'string' ? MONTH_PATTERN.exec(value) : null
  if (!match) throw createHttpError(400, `${label} phải có dạng YYYY-MM.`)
  return { year: Number(match[1]), month: Number(match[2]) }
}

// The instant a Vietnamese calendar month starts (midnight in Vietnam).
export function monthStart({ year, month }) {
  return new Date(Date.UTC(year, month - 1, 1) - VIETNAM_OFFSET_MS)
}

const nextMonth = ({ year, month }) => (month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 })

export function vietnamMonth(now = new Date()) {
  const local = new Date(now.getTime() + VIETNAM_OFFSET_MS)
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1 }
}

// The `count` months ending with the current Vietnamese month, oldest first.
export function lastMonths(count, now = new Date()) {
  let { year, month } = vietnamMonth(now)
  const months = []
  for (let i = 0; i < count; i += 1) {
    months.unshift(monthKey(year, month))
    month -= 1
    if (month === 0) { month = 12; year -= 1 }
  }
  return { from: months[0], to: months[months.length - 1] }
}

// Every month key from `from` to `to`, inclusive; rejects reversed or over-long ranges.
export function monthsBetween(from, to) {
  const start = parseMonth(from, 'Từ tháng')
  const end = parseMonth(to, 'Đến tháng')
  const keys = []
  let cursor = start
  while (cursor.year < end.year || (cursor.year === end.year && cursor.month <= end.month)) {
    keys.push(monthKey(cursor.year, cursor.month))
    if (keys.length > MAX_MONTHS) throw createHttpError(400, `Chỉ xem tối đa ${MAX_MONTHS} tháng mỗi lần.`)
    cursor = nextMonth(cursor)
  }
  if (!keys.length) throw createHttpError(400, 'Từ tháng phải trước hoặc bằng đến tháng.')
  return { keys, start: monthStart(start), end: monthStart(nextMonth(end)) }
}

// The report's month range: both ends given, or neither (the last six months up to this one).
export function reportRange(filters = {}, now = new Date()) {
  if (!filters.from && !filters.to) return lastMonths(DEFAULT_REPORT_MONTHS, now)
  if (!filters.from || !filters.to) throw createHttpError(400, 'Cần chọn cả từ tháng và đến tháng.')
  return { from: filters.from, to: filters.to }
}

// "Owing" orders: confirmed, partly or fully delivered, and paid less than their value. The dashboard's
// "Còn phải thu" and the sales list's "Chỉ đơn còn nợ" filter both use this one condition.
const paidPerOrderSql = Prisma.sql`(SELECT "order_id", SUM("amount") AS "amount" FROM "sales_payments" GROUP BY "order_id")`
export async function findOwingOrderIds(farmId) {
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT o."id" FROM "sales_orders" o
    LEFT JOIN ${paidPerOrderSql} paid ON paid."order_id" = o."id"
    WHERE o."farm_id" = CAST(${farmId} AS UUID)
      AND o."status" IN (${Prisma.join(OPEN_ORDER_STATUSES)})
      AND o."total_amount" - COALESCE(paid."amount", 0) > 0`)
  return rows.map((row) => row.id)
}

const vietnamMonthSql = (column) => Prisma.sql`to_char(date_trunc('month', ${Prisma.raw(column)} AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM')`
const inFarmsSql = (farmIds) => Prisma.sql`o."farm_id" IN (${Prisma.join(farmIds.map((id) => Prisma.sql`CAST(${id} AS UUID)`))})`

// Money stays exact: SQL returns decimals as text and they are added with Prisma.Decimal, never JS floats.
const decimal = (value) => new Prisma.Decimal(value ?? 0)
const money = (value) => value.toFixed(2)
const FIGURES = ['revenue', 'deliveredQuantity', 'orderValue', 'collected']
function addFigures(map, key, row) {
  const total = map.get(key) || Object.fromEntries(FIGURES.map((field) => [field, decimal(0)]))
  for (const field of FIGURES) if (row[field] !== undefined) total[field] = total[field].plus(decimal(row[field]))
  map.set(key, total)
}
const shapeFigures = (figures) => ({
  revenue: money(figures?.revenue ?? decimal(0)),
  deliveredQuantity: Number(figures?.deliveredQuantity ?? 0),
  orderValue: money(figures?.orderValue ?? decimal(0)),
  collected: money(figures?.collected ?? decimal(0)),
})

/**
 * Revenue figures for one farm, or several (`farmIds`, an owner's combined view), over a month range:
 * totals, every month in the range (empty months as zero), figures per farm, and money still owed now
 * (not tied to the range). SQL groups each figure by farm and month; the sums are added up here.
 */
export async function getRevenueSummary({ farmId, farmIds = [farmId], from, to }) {
  const { keys, start, end } = monthsBetween(from, to)
  const inFarms = inFarmsSql(farmIds)

  const [deliveredRows, orderValueRows, collectedRows, outstandingRows] = await prisma.$transaction([
    prisma.$queryRaw(Prisma.sql`
      SELECT o."farm_id"::text AS "farmId", ${vietnamMonthSql('d."created_at"')} AS "month",
             COALESCE(SUM(di."quantity" * oi."unit_price"), 0)::text AS "revenue",
             COALESCE(SUM(di."quantity"), 0)::bigint AS "deliveredQuantity"
      FROM "sales_delivery_items" di
      JOIN "sales_deliveries" d ON d."id" = di."delivery_id"
      JOIN "sales_order_items" oi ON oi."id" = di."order_item_id"
      JOIN "sales_orders" o ON o."id" = d."order_id"
      WHERE ${inFarms} AND d."created_at" >= ${start} AND d."created_at" < ${end}
      GROUP BY 1, 2`),
    prisma.$queryRaw(Prisma.sql`
      SELECT o."farm_id"::text AS "farmId", ${vietnamMonthSql('o."confirmed_at"')} AS "month",
             COALESCE(SUM(o."total_amount"), 0)::text AS "orderValue"
      FROM "sales_orders" o
      WHERE ${inFarms} AND o."confirmed_at" >= ${start} AND o."confirmed_at" < ${end}
        AND o."status" NOT IN (${Prisma.join(NOT_ORDER_VALUE_STATUSES)})
      GROUP BY 1, 2`),
    prisma.$queryRaw(Prisma.sql`
      SELECT o."farm_id"::text AS "farmId", ${vietnamMonthSql('p."created_at"')} AS "month",
             COALESCE(SUM(p."amount"), 0)::text AS "collected"
      FROM "sales_payments" p
      JOIN "sales_orders" o ON o."id" = p."order_id"
      WHERE ${inFarms} AND p."created_at" >= ${start} AND p."created_at" < ${end}
      GROUP BY 1, 2`),
    prisma.$queryRaw(Prisma.sql`
      SELECT o."farm_id"::text AS "farmId",
             COALESCE(SUM(o."total_amount" - COALESCE(paid."amount", 0)), 0)::text AS "outstandingAmount",
             COUNT(*) FILTER (WHERE o."total_amount" - COALESCE(paid."amount", 0) > 0)::int AS "outstandingOrders"
      FROM "sales_orders" o
      LEFT JOIN ${paidPerOrderSql} paid ON paid."order_id" = o."id"
      WHERE ${inFarms} AND o."status" IN (${Prisma.join(OPEN_ORDER_STATUSES)})
      GROUP BY 1`),
  ])

  const byMonth = new Map()
  const byFarm = new Map()
  const totals = new Map()
  for (const row of [...deliveredRows, ...orderValueRows, ...collectedRows]) {
    addFigures(byMonth, row.month, row)
    addFigures(byFarm, row.farmId, row)
    addFigures(totals, 'all', row)
  }

  const owed = new Map(outstandingRows.map((row) => [row.farmId, row]))
  const outstandingOf = (rows) => ({
    amount: money(rows.reduce((sum, row) => sum.plus(decimal(row.outstandingAmount)), decimal(0))),
    orders: rows.reduce((sum, row) => sum + Number(row.outstandingOrders), 0),
  })

  return {
    range: { from: keys[0], to: keys[keys.length - 1] },
    totals: shapeFigures(totals.get('all')),
    byMonth: keys.map((month) => ({ month, ...shapeFigures(byMonth.get(month)) })),
    outstanding: outstandingOf(outstandingRows),
    byFarm: farmIds.map((id) => ({
      farmId: id,
      ...shapeFigures(byFarm.get(id)),
      outstanding: outstandingOf(owed.has(id) ? [owed.get(id)] : []),
    })),
  }
}

/**
 * Per lot of one farm: fish ordered on orders confirmed in the range, fish delivered and revenue in the
 * range, and the average selling price (empty until something is delivered). Highest revenue first.
 */
export async function getRevenueByBatch({ farmId, from, to }) {
  const { start, end } = monthsBetween(from, to)
  const inFarm = inFarmsSql([farmId])
  const rows = await prisma.$queryRaw(Prisma.sql`
    WITH delivered AS (
      SELECT oi."batch_id", SUM(di."quantity")::bigint AS "quantity", SUM(di."quantity" * oi."unit_price") AS "revenue"
      FROM "sales_delivery_items" di
      JOIN "sales_deliveries" d ON d."id" = di."delivery_id"
      JOIN "sales_order_items" oi ON oi."id" = di."order_item_id"
      JOIN "sales_orders" o ON o."id" = d."order_id"
      WHERE ${inFarm} AND d."created_at" >= ${start} AND d."created_at" < ${end}
      GROUP BY oi."batch_id"
    ), ordered AS (
      SELECT oi."batch_id", SUM(oi."quantity")::bigint AS "quantity"
      FROM "sales_order_items" oi
      JOIN "sales_orders" o ON o."id" = oi."order_id"
      WHERE ${inFarm} AND o."confirmed_at" >= ${start} AND o."confirmed_at" < ${end}
        AND o."status" NOT IN (${Prisma.join(NOT_ORDER_VALUE_STATUSES)})
      GROUP BY oi."batch_id"
    )
    SELECT b."id" AS "batchId", b."batch_code" AS "batchCode", b."status" AS "batchStatus",
           t."code" AS "tankCode", t."name" AS "tankName",
           COALESCE(ordered."quantity", 0)::bigint AS "orderedQuantity",
           COALESCE(delivered."quantity", 0)::bigint AS "lotDelivered",
           COALESCE(delivered."revenue", 0)::text AS "lotRevenue"
    FROM delivered
    FULL OUTER JOIN ordered ON ordered."batch_id" = delivered."batch_id"
    JOIN "seed_batches" b ON b."id" = COALESCE(delivered."batch_id", ordered."batch_id")
    LEFT JOIN "ponds_tanks" t ON t."id" = b."tank_id"
    ORDER BY COALESCE(delivered."revenue", 0) DESC, b."batch_code" ASC`)

  return rows.map((row) => {
    const deliveredQuantity = Number(row.lotDelivered)
    const revenue = decimal(row.lotRevenue)
    return {
      batchId: row.batchId,
      batchCode: row.batchCode,
      batchStatus: row.batchStatus,
      tank: row.tankCode ? { code: row.tankCode, name: row.tankName } : null,
      orderedQuantity: Number(row.orderedQuantity),
      deliveredQuantity,
      revenue: money(revenue),
      averagePrice: deliveredQuantity > 0 ? money(revenue.div(deliveredQuantity)) : null,
    }
  })
}

// Farms the user really owns: an active OWNER membership. Inactive and archived farms count, since
// their past revenue is still revenue. Admin rights do not add farms.
async function ownedFarms(userId) {
  const memberships = await prisma.farmMember.findMany({
    where: { userId, role: 'OWNER', status: 'active' },
    select: { farm: { select: { id: true, code: true, name: true, status: true } } },
  })
  return memberships.map((member) => member.farm).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

/**
 * Revenue tab for the selected farm, for the owner and the farm manager (area managers still see each
 * order's money on the sales list). `ownedFarms` tells the page whether to offer the combined view.
 */
export async function getRevenueReport({ farmId, membership, actor, filters, now }) {
  if (!REPORT_ROLES.includes(membership?.role)) throw createHttpError(403, 'Bạn không có quyền xem doanh thu của trại này.')
  const range = reportRange(filters, now)
  const [summary, byBatch, owned] = await Promise.all([
    getRevenueSummary({ farmId, ...range }),
    getRevenueByBatch({ farmId, ...range }),
    membership.role === 'OWNER' && actor?.id ? ownedFarms(actor.id) : [],
  ])
  const { byFarm: _byFarm, ...report } = summary
  return { ...report, byBatch, ownedFarms: owned.length }
}

/**
 * Combined view over every farm the user owns. The farm list is worked out here and never taken from
 * the client. Fewer than two owned farms: nothing to combine, so 403.
 */
export async function getCombinedRevenueReport({ actor, filters, now }) {
  const farms = await ownedFarms(actor.id)
  if (farms.length < 2) throw createHttpError(403, 'Chỉ Chủ trại sở hữu từ 2 trại trở lên mới xem được doanh thu gộp.')
  const summary = await getRevenueSummary({ farmIds: farms.map((farm) => farm.id), ...reportRange(filters, now) })
  const farmById = new Map(farms.map((farm) => [farm.id, farm]))
  return {
    ...summary,
    farms: farms.length,
    byFarm: summary.byFarm
      .map(({ farmId, ...figures }) => ({ farm: farmById.get(farmId), ...figures }))
      .sort((a, b) => decimal(b.revenue).cmp(decimal(a.revenue)) || a.farm.name.localeCompare(b.farm.name, 'vi')),
  }
}
