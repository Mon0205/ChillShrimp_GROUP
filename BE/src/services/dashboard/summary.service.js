import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'
import { getRevenueSummary, lastMonths, monthsBetween } from '../sales/revenue-report.service.js'

// Dashboard: four "to-do" counts for every role that has one, plus a few situation figures for the
// management roles. Every count uses the same scope rules as the page its card links to, so the number
// on the card matches what that page lists. Spec: docs/superpowers/specs/2026-11-21-dashboard-design.md.
// Technicians get "Việc hôm nay" (cards only); warehouse staff have no dashboard and land on Inventory.

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
// Vietnam has no daylight saving time, so "today" is a fixed UTC+7 offset.
const VIETNAM_OFFSET_MS = 7 * HOUR_MS
export const WATER_CHECK_HOURS = 24
export const REVENUE_MONTHS = 6
export const ALERT_RESOLUTION_DAYS = 30
const TANK_ROW_LIMIT = 10
const PENDING_ORDER_LIMIT = 5
const CARD_ITEM_LIMIT = 5

const FARM_WIDE_ROLES = ['OWNER', 'FARM_MANAGER']
const OPEN_ALERT_STATUSES = ['open', 'in_progress']
const BATCHES_IN_TANK = ['active', 'ready_for_sale']
const ORDERS_TO_DELIVER = ['confirmed', 'partially_delivered']
const UNFINISHED_AI_INSPECTIONS = ['pending', 'failed']

export const ROLE_CARDS = {
  OWNER: ['critical_alerts', 'overdue_batches', 'low_stock', 'orders_to_deliver'],
  FARM_MANAGER: ['unassigned_alerts', 'pending_supply_requests', 'orders_to_deliver'],
  AREA_MANAGER: ['unassigned_alerts', 'tanks_no_water_check', 'pending_supply_requests'],
  TECHNICIAN: ['assigned_alerts', 'tanks_not_fed_today', 'tanks_no_water_check', 'unfinished_ai_inspections'],
}

/**
 * startOfToday: the instant today began in Vietnam (for timestamp columns).
 * today: today's Vietnamese calendar date as UTC midnight (for @db.Date columns such as expectedSaleDate).
 */
export function vietnamDay(now = new Date()) {
  const localDayStart = Math.floor((now.getTime() + VIETNAM_OFFSET_MS) / DAY_MS) * DAY_MS
  return { startOfToday: new Date(localDayStart - VIETNAM_OFFSET_MS), today: new Date(localDayStart) }
}

const isFarmWide = (context) => FARM_WIDE_ROLES.includes(context.membership.role)

// Ponds/tanks the member may see: the whole farm, or only their area (same rule as the care-log and seed-batch services).
function visibleTankWhere(context) {
  if (isFarmWide(context)) return { farmId: context.farmId, deletedAt: null }
  if (!context.membership.areaId) throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
  return { farmId: context.farmId, deletedAt: null, areaId: context.membership.areaId }
}

// Same scope as the alerts page (environment threshold alerts, limited to the member's area below farm level).
function openAlertWhere(context) {
  return {
    farmId: context.farmId,
    alertType: 'environment_threshold',
    status: { in: OPEN_ALERT_STATUSES },
    ...(isFarmWide(context) ? {} : { tank: { is: { areaId: visibleTankWhere(context).areaId } } }),
  }
}

const batchesInTankWhere = (context, statuses = BATCHES_IN_TANK) => ({ status: { in: statuses }, tank: visibleTankWhere(context) })

function pendingRequestWhere(context) {
  return {
    farmId: context.farmId,
    status: 'pending',
    ...(context.membership.role === 'AREA_MANAGER' ? { areaId: visibleTankWhere(context).areaId } : {}),
  }
}

/**
 * Ponds/tanks whose care the member is checked against. A technician covers the tanks they are
 * responsible for; with none assigned they cover their whole area. Others cover what they can see.
 */
async function careTankScope(context) {
  const visible = visibleTankWhere(context)
  if (context.membership.role !== 'TECHNICIAN') return { where: visible, wholeArea: !isFarmWide(context) }
  const own = { ...visible, responsibleUserId: context.actor.id }
  const owned = await prisma.pondTank.count({ where: own })
  return owned ? { where: own, wholeArea: false } : { where: visible, wholeArea: true }
}
const careScopeHint = (context) => (context.careScope.wholeArea ? 'Toàn khu vực' : 'Ao/bể bạn phụ trách')

const tanksNotFedTodayWhere = (context) => ({
  ...context.careScope.where,
  status: 'active',
  feedingLogs: { none: { feedingTime: { gte: context.day.startOfToday } } },
})

const tanksWithoutWaterCheckWhere = (context) => ({
  ...context.careScope.where,
  status: 'active',
  waterParameterLogs: { none: { recordedAt: { gte: new Date(context.now.getTime() - WATER_CHECK_HOURS * HOUR_MS) } } },
})

const tankItems = (where) => prisma.pondTank.findMany({ where, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' }, take: CARD_ITEM_LIMIT })

const CARDS = {
  assigned_alerts: {
    label: 'Cảnh báo giao cho tôi',
    link: '/alerts?assignedToMe=true',
    tone: 'danger',
    // Every open alert assigned to me, read or not: the bell stops reminding once a notification is read.
    count: (context) => prisma.alertNotification.count({ where: { ...openAlertWhere(context), responsibleUserId: context.actor.id } }),
  },
  tanks_not_fed_today: {
    label: 'Ao/bể chưa cho ăn hôm nay',
    link: '/care-logs?tab=feeding',
    hint: careScopeHint,
    count: (context) => prisma.pondTank.count({ where: tanksNotFedTodayWhere(context) }),
    items: (context) => tankItems(tanksNotFedTodayWhere(context)),
  },
  unfinished_ai_inspections: {
    label: 'Kiểm tra AI chờ hoặc lỗi',
    link: `/quality-checks?status=${UNFINISHED_AI_INSPECTIONS.join(',')}&mine=true`, // the card counts my own inspections; the page filters the same way
    count: (context) => prisma.aiInspection.count({
      where: { createdBy: context.actor.id, status: { in: UNFINISHED_AI_INSPECTIONS }, batch: { tank: visibleTankWhere(context) } },
    }),
  },
  critical_alerts: {
    label: 'Cảnh báo nguy hiểm đang mở',
    link: '/alerts',
    tone: 'danger',
    count: (context) => prisma.alertNotification.count({ where: { ...openAlertWhere(context), severity: 'critical' } }),
  },
  unassigned_alerts: {
    label: 'Cảnh báo chưa giao người xử lý',
    link: '/alerts',
    count: (context) => prisma.alertNotification.count({ where: { ...openAlertWhere(context), responsibleUserId: null } }),
  },
  overdue_batches: {
    label: 'Lô quá hạn bán',
    link: '/seed-batches',
    tone: 'danger',
    count: (context) => prisma.seedBatch.count({ where: { ...batchesInTankWhere(context), expectedSaleDate: { lt: context.day.today } } }),
  },
  tanks_no_water_check: {
    label: `Ao/bể chưa đo nước ${WATER_CHECK_HOURS} giờ`,
    link: '/care-logs?tab=water-parameters',
    hint: careScopeHint,
    count: (context) => prisma.pondTank.count({ where: tanksWithoutWaterCheckWhere(context) }),
    // The care-log page cannot filter "tanks not logged yet", so the card names them.
    items: (context) => tankItems(tanksWithoutWaterCheckWhere(context)),
  },
  low_stock: {
    label: 'Vật tư dưới ngưỡng tối thiểu',
    link: '/inventory-supplies',
    // Same rule as the inventory page's "below threshold" filter: quantity < min_threshold.
    count: (context) => prisma.inventorySupply.count({
      where: { farmId: context.farmId, quantity: { lt: prisma.inventorySupply.fields.minThreshold } },
    }),
  },
  pending_supply_requests: {
    label: 'Yêu cầu vật tư chờ duyệt',
    link: '/inventory-requests',
    count: (context) => prisma.inventorySupplyRequest.count({ where: pendingRequestWhere(context) }),
  },
  orders_to_deliver: {
    label: 'Đơn bán chờ giao',
    // Opens the sales list on its "Chờ giao" tab: the same two statuses this card counts.
    link: `/sales-orders?status=${ORDERS_TO_DELIVER.join(',')}`,
    count: (context) => prisma.salesOrder.count({ where: { farmId: context.farmId, status: { in: ORDERS_TO_DELIVER } } }),
    // Orders already past their promised delivery date; the card turns red when there are any.
    overdue: (context) => prisma.salesOrder.count({
      where: { farmId: context.farmId, status: { in: ORDERS_TO_DELIVER }, expectedDeliveryDate: { lt: context.day.today } },
    }),
  },
}

async function buildCard(context, code) {
  const { label, link, tone = 'attention', hint, count, items, overdue } = CARDS[code]
  const [total, list, late] = await Promise.all([count(context), items ? items(context) : null, overdue ? overdue(context) : null])
  const hintText = typeof hint === 'function' ? hint(context) : hint
  return {
    code,
    label,
    count: total,
    link,
    tone: late > 0 ? 'danger' : tone,
    ...(hintText ? { hint: hintText } : {}),
    ...(list ? { items: list } : {}),
    ...(late !== null ? { overdue: late } : {}),
  }
}

const decimal = (value) => new Prisma.Decimal(value ?? 0)
const dateOnly = (value) => (value ? value.toISOString().slice(0, 10) : null)

// Production figures, farm-wide or for the area: tanks in use, lots and fish in tanks, and the fish still
// open for sale (ready-for-sale lots minus what pending orders already hold).
async function productionStats(context) {
  const tankWhere = visibleTankWhere(context)
  const [tanksActive, tanksTotal, active, readyForSale, inTank, sellable] = await Promise.all([
    prisma.pondTank.count({ where: { ...tankWhere, status: 'active' } }),
    prisma.pondTank.count({ where: tankWhere }),
    prisma.seedBatch.count({ where: batchesInTankWhere(context, ['active']) }),
    prisma.seedBatch.count({ where: batchesInTankWhere(context, ['ready_for_sale']) }),
    prisma.seedBatch.aggregate({ where: batchesInTankWhere(context), _sum: { currentEstimatedQuantity: true } }),
    prisma.seedBatch.aggregate({ where: batchesInTankWhere(context, ['ready_for_sale']), _sum: { currentEstimatedQuantity: true, reservedQuantity: true } }),
  ])
  const sellableQuantity = sellable._sum.currentEstimatedQuantity ?? 0
  const reserved = sellable._sum.reservedQuantity ?? 0
  return {
    tanks: { active: tanksActive, total: tanksTotal },
    batches: { active, readyForSale, total: active + readyForSale },
    estimatedQuantity: inTank._sum.currentEstimatedQuantity ?? 0,
    sellable: { available: Math.max(0, sellableQuantity - reserved), reserved },
  }
}

// Material cost = supplies actually used (usage transactions, quantity × the unit price recorded then) in the
// Vietnamese month. Stock imports are money spent buying, not cost used, and adjustments are corrections.
async function materialCostOfMonth(context, month) {
  const { start, end } = monthsBetween(month, month)
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT COALESCE(SUM(t."quantity" * t."unit_price"), 0)::text AS "materialCost"
    FROM "inventory_transactions" t
    JOIN "inventory_supplies" s ON s."id" = t."supply_id"
    WHERE s."farm_id" = CAST(${context.farmId} AS UUID)
      AND t."transaction_type" = 'usage'
      AND t."transaction_date" >= ${start} AND t."transaction_date" < ${end}`)
  return rows[0]?.materialCost ?? '0'
}

// Business block (owner and farm manager): this month's figures and six months for the chart, all from the
// revenue report's own service so both places show the same numbers.
async function businessStats(context) {
  const range = lastMonths(REVENUE_MONTHS, context.now)
  const [summary, materialCost] = await Promise.all([
    getRevenueSummary({ farmId: context.farmId, ...range }),
    materialCostOfMonth(context, range.to),
  ])
  const current = summary.byMonth[summary.byMonth.length - 1]
  const revenue = decimal(current.revenue)
  const profit = revenue.minus(decimal(materialCost))
  return {
    summary,
    business: {
      month: current.month,
      revenue: current.revenue,
      collected: current.collected,
      deliveredQuantity: current.deliveredQuantity,
      materialCost: decimal(materialCost).toFixed(2),
      grossProfit: profit.toFixed(2),
      marginPercent: revenue.gt(0) ? profit.div(revenue).times(100).toDecimalPlaces(0).toNumber() : null,
      outstanding: summary.outstanding,
      byMonth: summary.byMonth.map(({ month, revenue: amount, collected }) => ({ month, revenue: amount, collected })),
    },
  }
}

// The few open orders that matter most: promised delivery soonest first (orders with no date last).
async function pendingOrders(context) {
  const orders = await prisma.salesOrder.findMany({
    where: { farmId: context.farmId, status: { in: ORDERS_TO_DELIVER } },
    orderBy: [{ expectedDeliveryDate: 'asc' }, { createdAt: 'asc' }],
    take: PENDING_ORDER_LIMIT,
    select: {
      id: true, orderCode: true, customerName: true, expectedDeliveryDate: true, totalAmount: true,
      items: { select: { quantity: true, deliveredQuantity: true } },
      payments: { select: { amount: true } },
    },
  })
  return orders.map((order) => ({
    id: order.id,
    orderCode: order.orderCode,
    customerName: order.customerName,
    expectedDeliveryDate: dateOnly(order.expectedDeliveryDate),
    quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    deliveredQuantity: order.items.reduce((sum, item) => sum + item.deliveredQuantity, 0),
    outstandingAmount: decimal(order.totalAmount).minus(order.payments.reduce((sum, payment) => sum.plus(decimal(payment.amount)), decimal(0))).toFixed(2),
  }))
}

// Today's progress and one row per tank, for the people who do the daily care (technician, area manager).
// The same tank scope as the cards. Tanks with work left come first, empty tanks last.
async function careBoard(context) {
  const waterSince = new Date(context.now.getTime() - WATER_CHECK_HOURS * HOUR_MS)
  const tanks = await prisma.pondTank.findMany({
    where: context.careScope.where,
    select: {
      id: true, code: true, name: true, status: true,
      responsibleUser: { select: { displayName: true, email: true } },
      seedBatches: { where: { status: { in: BATCHES_IN_TANK } }, select: { batchCode: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { feedingLogs: { where: { feedingTime: { gte: context.day.startOfToday } } } } },
      feedingLogs: { select: { feedCheckStatus: true }, orderBy: { feedingTime: 'desc' }, take: 1 },
      waterParameterLogs: { select: { recordedAt: true }, orderBy: { recordedAt: 'desc' }, take: 1 },
    },
  })
  const rows = tanks.map((tank) => ({
    id: tank.id,
    code: tank.code,
    name: tank.name,
    status: tank.status,
    batchCode: tank.seedBatches[0]?.batchCode ?? null,
    responsible: tank.responsibleUser?.displayName || tank.responsibleUser?.email || null,
    feedingsToday: tank._count.feedingLogs,
    lastFeedCheck: tank.feedingLogs[0]?.feedCheckStatus ?? null,
    lastWaterAt: tank.waterParameterLogs[0]?.recordedAt?.toISOString() ?? null,
  }))
  const inUse = rows.filter((row) => row.status === 'active')
  const waterDone = (row) => Boolean(row.lastWaterAt) && new Date(row.lastWaterAt) >= waterSince
  const order = (row) => (row.status !== 'active' ? 2 : row.feedingsToday === 0 || !waterDone(row) ? 0 : 1)
  rows.sort((a, b) => order(a) - order(b) || a.code.localeCompare(b.code))
  return {
    progress: {
      tanks: inUse.length,
      fed: inUse.filter((row) => row.feedingsToday > 0).length,
      waterChecked: inUse.filter(waterDone).length,
    },
    tankRows: rows.slice(0, TANK_ROW_LIMIT),
  }
}

// Owner: production, inventory value, the business block and the open orders.
async function ownerStats(context) {
  const [production, inventory, { summary, business }, orders] = await Promise.all([
    productionStats(context),
    prisma.$queryRaw(Prisma.sql`
      SELECT COALESCE(SUM("quantity" * "unit_price"), 0)::text AS "value"
      FROM "inventory_supplies" WHERE "farm_id" = CAST(${context.farmId} AS UUID)`),
    businessStats(context),
    pendingOrders(context),
  ])
  return {
    batches: production.batches,
    estimatedQuantity: production.estimatedQuantity,
    inventoryValue: inventory[0]?.value ?? '0',
    revenue: { byMonth: summary.byMonth.map(({ month, revenue: amount }) => ({ month, revenue: amount })), outstanding: summary.outstanding },
    production,
    business,
    pendingOrders: orders,
  }
}

// Farm manager: open alerts per active area (including areas with none, so the busiest stands out), how fast
// alerts get resolved, plus the same production, business block and open orders as the owner.
async function farmManagerStats(context) {
  const resolvedSince = new Date(context.now.getTime() - ALERT_RESOLUTION_DAYS * DAY_MS)
  const [areas, rows, resolution, production, { business }, orders] = await Promise.all([
    prisma.area.findMany({ where: { farmId: context.farmId, status: 'active' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.$queryRaw(Prisma.sql`
      SELECT t."area_id" AS "areaId",
             COUNT(*)::int AS "open",
             COUNT(*) FILTER (WHERE al."severity" = 'critical')::int AS "critical"
      FROM "alerts_notifications" al
      JOIN "ponds_tanks" t ON t."id" = al."tank_id"
      WHERE al."farm_id" = CAST(${context.farmId} AS UUID)
        AND al."alert_type" = 'environment_threshold'
        AND al."status" IN (${Prisma.join(OPEN_ALERT_STATUSES)})
      GROUP BY t."area_id"`),
    prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(*)::int AS "resolvedCount",
             COALESCE(AVG(EXTRACT(EPOCH FROM (al."handled_at" - al."created_at")) / 3600), 0)::float AS "averageHours"
      FROM "alerts_notifications" al
      WHERE al."farm_id" = CAST(${context.farmId} AS UUID)
        AND al."alert_type" = 'environment_threshold'
        AND al."status" = 'resolved'
        AND al."handled_at" >= ${resolvedSince}`),
    productionStats(context),
    businessStats(context),
    pendingOrders(context),
  ])
  const byArea = new Map(rows.map((row) => [row.areaId, row]))
  const alertsByArea = areas.map((area) => ({ areaId: area.id, name: area.name, open: byArea.get(area.id)?.open ?? 0, critical: byArea.get(area.id)?.critical ?? 0 }))
  const unassigned = byArea.get(null)
  if (unassigned) alertsByArea.push({ areaId: null, name: 'Ao/bể chưa thuộc khu vực', open: unassigned.open, critical: unassigned.critical })
  alertsByArea.sort((a, b) => b.open - a.open || a.name.localeCompare(b.name, 'vi'))
  const resolved = resolution[0] || {}
  return {
    alertsByArea,
    alertResolution: { averageHours: Math.round((resolved.averageHours ?? 0) * 10) / 10, count: Number(resolved.resolvedCount ?? 0) },
    production,
    business,
    pendingOrders: orders,
  }
}

// Area manager: lots being nursed in the area, the area's tanks and today's care board.
async function areaManagerStats(context) {
  const where = batchesInTankWhere(context, ['active'])
  const [count, quantity, production, board] = await Promise.all([
    prisma.seedBatch.count({ where }),
    prisma.seedBatch.aggregate({ where, _sum: { currentEstimatedQuantity: true } }),
    productionStats(context),
    careBoard(context),
  ])
  return { activeBatches: { count, estimatedQuantity: quantity._sum.currentEstimatedQuantity ?? 0 }, production: { tanks: production.tanks }, ...board }
}

// Technicians work tank by tank and do not dispatch work: no figures, only what they cover and today's care board.
async function technicianStats(context) {
  const [tanks, batches, board] = await Promise.all([
    prisma.pondTank.count({ where: context.careScope.where }),
    prisma.seedBatch.count({ where: { status: { in: BATCHES_IN_TANK }, tank: context.careScope.where } }),
    careBoard(context),
  ])
  return { scope: { tanks, batches, wholeArea: context.careScope.wholeArea }, ...board }
}

const ROLE_STATS = { OWNER: ownerStats, FARM_MANAGER: farmManagerStats, AREA_MANAGER: areaManagerStats, TECHNICIAN: technicianStats }

export async function getDashboardSummary(operation) {
  const role = operation.membership.role
  const codes = ROLE_CARDS[role]
  if (!codes) throw createHttpError(403, 'Vai trò hiện tại chưa có Dashboard.')

  const now = operation.now || new Date()
  const context = { ...operation, now, day: vietnamDay(now) }
  visibleTankWhere(context) // fail early when an area role has no area
  context.careScope = await careTankScope(context)

  const [cards, stats] = await Promise.all([
    Promise.all(codes.map((code) => buildCard(context, code))),
    ROLE_STATS[role](context),
  ])
  return { role, scope: isFarmWide(context) ? 'farm' : 'area', generatedAt: now.toISOString(), cards, stats }
}
