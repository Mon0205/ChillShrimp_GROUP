import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'
import { isSystemAdmin } from '../auth/account-access.service.js'
import { createAssignmentNotification } from './alert-notification.service.js'
import { defaultAlertResponsible, eligibleMembership, eligibleAlertMembers, eligibleAlertWorker } from './alert-responsibility.service.js'
import { Prisma } from '@prisma/client'
import {
  normalizeEnvironmentThresholdInput,
  classifyEnvironmentMeasurement,
  ENVIRONMENT_PARAMETERS,
  selectApplicableThreshold,
} from '../../utils/environment-threshold.validation.js'

export async function createEnvironmentAlerts(tx, { farmId, tank, log }) {
  const activeBatch = await tx.seedBatch.findFirst({
    where: { tankId: tank.id, status: { notIn: ['sold', 'failed', 'cancelled'] } },
    orderBy: [{ createdAt: 'desc' }],
    select: { id: true, species: true, developmentStage: true },
  })
  const measured = Object.entries(ENVIRONMENT_PARAMETERS)
    .filter(([, definition]) => log[definition.field] !== null)
    .map(([parameterCode, definition]) => ({
      parameterCode,
      ...definition,
      value: Number(log[definition.field]),
    }))
  if (!measured.length) return []

  const effectiveDate = new Date(`${log.recordedAt.toISOString().slice(0, 10)}T00:00:00.000Z`)
  const thresholds = await tx.environmentThreshold.findMany({
    where: {
      farmId,
      isActive: true,
      approvedAt: { not: null },
      approvedBy: { not: null },
      effectiveFrom: { lte: effectiveDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveDate } }],
      parameterCode: { in: measured.map((entry) => entry.parameterCode) },
    },
  })

  const alerts = []
  for (const measurement of measured) {
    const threshold = selectApplicableThreshold(thresholds.filter((item) => item.parameterCode === measurement.parameterCode), {
      species: activeBatch?.species,
      developmentStage: activeBatch?.developmentStage,
      tankType: tank.tankType,
    })
    if (!threshold) continue

    const severity = classifyEnvironmentMeasurement(measurement.value, threshold)
    if (!severity) continue
    const lowerLimit = severity === 'critical' ? threshold.dangerMin : threshold.warningMin
    const isBelowLimit = lowerLimit !== null && measurement.value < Number(lowerLimit)
    const boundary = severity === 'critical'
      ? (isBelowLimit ? `thấp hơn ngưỡng nguy hiểm ${threshold.dangerMin}` : `cao hơn ngưỡng nguy hiểm ${threshold.dangerMax}`)
      : (isBelowLimit ? `thấp hơn ngưỡng cảnh báo ${threshold.warningMin}` : `cao hơn ngưỡng cảnh báo ${threshold.warningMax}`)
    alerts.push({
      farmId,
      batchId: activeBatch?.id || null,
      tankId: tank.id,
      thresholdId: threshold.id,
      sourceLogId: log.id,
      parameterCode: measurement.parameterCode,
      observedValue: new Prisma.Decimal(String(measurement.value)),
      alertType: 'environment_threshold',
      severity,
      title: `${measurement.title} ${severity === 'critical' ? 'nguy hiểm' : 'cảnh báo'}`,
      message: `${tank.name} (${tank.code}): đo được ${measurement.value}${threshold.unit ? ` ${threshold.unit}` : ''}, ${boundary}. Ngưỡng áp dụng: ${threshold.species}/${threshold.developmentStage}/${threshold.tankType}.`,
    })
  }

  if (!alerts.length) return []
  await tx.$queryRaw`SELECT id FROM ponds_tanks WHERE id = ${tank.id}::uuid FOR SHARE`
  const currentTank = await tx.pondTank.findFirst({ where: { id: tank.id, farmId }, select: { areaId: true, responsibleUserId: true } })
  const responsibleUserId = currentTank ? await defaultAlertResponsible(tx, { farmId, tank: currentTank }) : null
  await tx.alertNotification.createMany({ data: alerts.map(alert => ({ ...alert, responsibleUserId, assignedAt: responsibleUserId ? new Date() : null })) })
  const persisted = await tx.alertNotification.findMany({
    where: { sourceLogId: log.id },
    orderBy: [{ parameterCode: 'asc' }],
  })
  for (const alert of persisted) await createAssignmentNotification(tx, { ...alert, assignmentVersion: alert.assignmentVersion ?? 0 })
  return persisted
}


function normalizeInput(body) {
  try { return normalizeEnvironmentThresholdInput(body) }
  catch (error) { throw createHttpError(400, error.message) }
}

function toPrismaData(input) {
  const data = { ...input }
  for (const field of ['optimalMin', 'optimalMax', 'warningMin', 'warningMax', 'dangerMin', 'dangerMax']) {
    data[field] = input[field] === null ? null : new Prisma.Decimal(String(input[field]))
  }
  return data
}

const includeAudit = {
  creator: { select: { id: true, displayName: true, email: true } },
  approver: { select: { id: true, displayName: true, email: true } },
}
const ENVIRONMENT_ALERT_SEVERITIES = new Set(['warning', 'critical'])
const ALERT_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function environmentalAlertWhere(operation, alertId) {
  if (!['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(operation.membership.role)) throw createHttpError(403, 'Bạn không có quyền truy cập cảnh báo môi trường.')
  if (!['OWNER', 'FARM_MANAGER'].includes(operation.membership.role) && !operation.membership.areaId) throw createHttpError(403, 'Tài khoản chưa được phân công khu vực.')
  if (alertId && !ALERT_UUID_PATTERN.test(alertId)) throw createHttpError(400, 'Mã cảnh báo không hợp lệ.')
  return {
    ...(alertId ? { id: alertId } : {}),
    farmId: operation.farmId,
    alertType: 'environment_threshold',
    ...(['OWNER', 'FARM_MANAGER'].includes(operation.membership.role) ? {} : { tank: { is: { areaId: operation.membership.areaId } } }),
  }
}

export async function listEnvironmentThresholds(operation) {
  const items = await prisma.environmentThreshold.findMany({
    where: { farmId: operation.farmId },
    include: includeAudit,
    orderBy: [{ isActive: 'desc' }, { parameterCode: 'asc' }, { species: 'asc' }, { developmentStage: 'asc' }],
  })
  return items
}

export async function createEnvironmentThreshold(operation) {
  const input = normalizeInput(operation.input)
  const item = await prisma.environmentThreshold.create({
    data: { ...toPrismaData(input), farmId: operation.farmId, createdBy: operation.actor.id },
    include: includeAudit,
  })
  return item
}

export async function updateEnvironmentThreshold(operation) {
  const input = normalizeInput(operation.input)
  const existing = await prisma.environmentThreshold.findFirst({
    where: { id: operation.thresholdId, farmId: operation.farmId },
    select: { id: true, approvedAt: true },
  })
  if (!existing) throw createHttpError(404, 'Environmental threshold not found in this farm.')

  if (existing.approvedAt) {
    const revision = await prisma.environmentThreshold.create({
      data: { ...toPrismaData(input), farmId: operation.farmId, createdBy: operation.actor.id },
      include: includeAudit,
    })
    return { threshold: revision, revisionCreated: true }
  }

  const item = await prisma.environmentThreshold.update({
    where: { id: existing.id },
    data: { ...toPrismaData(input), isActive: false, approvedBy: null, approvedAt: null },
    include: includeAudit,
  })
  return { threshold: item, revisionCreated: false }
}

export async function approveEnvironmentThreshold(operation) {
  const existing = await prisma.environmentThreshold.findFirst({
    where: { id: operation.thresholdId, farmId: operation.farmId },
    select: { id: true },
  })
  if (!existing) throw createHttpError(404, 'Environmental threshold not found in this farm.')

  const item = await prisma.environmentThreshold.update({
    where: { id: existing.id },
    data: { approvedBy: operation.actor.id, approvedAt: new Date(), isActive: true },
    include: includeAudit,
  })
  return item
}

export async function setEnvironmentThresholdStatus(operation) {
  if (typeof operation.input?.isActive !== 'boolean') throw createHttpError(400, 'isActive must be a boolean.')
  const existing = await prisma.environmentThreshold.findFirst({
    where: { id: operation.thresholdId, farmId: operation.farmId },
    select: { id: true, approvedAt: true },
  })
  if (!existing) throw createHttpError(404, 'Environmental threshold not found in this farm.')
  if (operation.input.isActive && !existing.approvedAt) throw createHttpError(409, 'Approve the threshold before activating it.')

  const item = await prisma.environmentThreshold.update({
    where: { id: existing.id },
    data: { isActive: operation.input.isActive },
    include: includeAudit,
  })
  return item
}

function alertInclude(userId) {
  return {
    tank: { select: { id: true, code: true, name: true, areaId: true } },
    batch: { select: { id: true, batchCode: true, species: true, developmentStage: true } },
    reads: { where: { userId }, select: { readAt: true } },
    responsibleUser: { select: { id: true, displayName: true, email: true } },
    handler: { select: { id: true, displayName: true, email: true } },
  }
}

function alertDetailInclude(userId) {
  return {
      ...alertInclude(userId),
      threshold: { select: {
        id: true, species: true, developmentStage: true, tankType: true, parameterCode: true, unit: true,
        warningMin: true, warningMax: true, dangerMin: true, dangerMax: true,
        effectiveFrom: true, effectiveTo: true,
      } },
      sourceLog: { select: { id: true, recordedAt: true, measurementMethod: true, measurementDevice: true, notes: true } },
    }
}

function personalAlert(item) {
  const { reads, ...alert } = item
  return { ...alert, isRead: Boolean(reads?.length), readAt: reads?.[0]?.readAt || null }
}

export async function listEnvironmentalAlerts(operation) {
  const page = operation.filters.page === undefined ? 1 : Number(operation.filters.page)
  const limit = operation.filters.limit === undefined ? 20 : Number(operation.filters.limit)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createHttpError(400, 'Trang phải là số nguyên dương; số dòng từ 1 đến 100.')
  }
  const scope = environmentalAlertWhere(operation)
  const where = { ...scope }
  if (operation.filters.severity) {
    if (!ENVIRONMENT_ALERT_SEVERITIES.has(operation.filters.severity)) throw createHttpError(400, 'Mức độ phải là warning hoặc critical.')
    where.severity = operation.filters.severity
  }
  if (operation.filters.status) {
    if (!['open', 'in_progress', 'resolved'].includes(operation.filters.status)) throw createHttpError(400, 'Trạng thái xử lý không hợp lệ.')
    where.status = operation.filters.status
  }
  for (const key of ['tankId', 'areaId']) {
    if (operation.filters[key] && !ALERT_UUID_PATTERN.test(operation.filters[key])) throw createHttpError(400, 'Mã ao/bể hoặc khu vực không hợp lệ.')
  }
  if (operation.filters.tankId) where.tankId = operation.filters.tankId
  if (operation.filters.areaId) {
    where.AND = [{ tank: { is: { areaId: operation.filters.areaId } } }]
  }
  const dates = {}
  for (const [key, op] of [['from', 'gte'], ['to', 'lte']]) {
    if (!operation.filters[key]) continue
    if (typeof operation.filters[key] !== 'string') throw createHttpError(400, 'Thời gian lọc không hợp lệ.')
    const date = new Date(operation.filters[key])
    if (Number.isNaN(date.getTime())) throw createHttpError(400, 'Thời gian lọc không hợp lệ.')
    dates[op] = date
  }
  if (dates.gte && dates.lte && dates.gte > dates.lte) throw createHttpError(400, 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')
  if (Object.keys(dates).length) where.createdAt = dates
  if (operation.filters.isRead !== undefined && operation.filters.isRead !== '') {
    if (!['true', 'false'].includes(operation.filters.isRead)) throw createHttpError(400, 'isRead phải là true hoặc false.')
    where.reads = { [operation.filters.isRead === 'true' ? 'some' : 'none']: { userId: operation.actor.id } }
  }
  const [items, total, unreadCount] = await prisma.$transaction([
    prisma.alertNotification.findMany({
      where, include: alertInclude(operation.actor.id),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.alertNotification.count({ where }),
    prisma.alertNotification.count({ where: { ...scope, reads: { none: { userId: operation.actor.id } } } }),
  ])
  return { items: items.map(personalAlert), unreadCount, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } }
}

export async function getEnvironmentalAlert(operation) {
  const where = environmentalAlertWhere(operation, operation.alertId)
  const item = await prisma.alertNotification.findFirst({
    where,
    include: alertDetailInclude(operation.actor.id),
  })
  if (!item) throw createHttpError(404, 'Không tìm thấy cảnh báo trong phạm vi được cấp quyền.')
  return personalAlert(item)
}

export async function markEnvironmentalAlertRead(operation) {
  const where = environmentalAlertWhere(operation, operation.alertId)
  const existing = await prisma.alertNotification.findFirst({ where, select: { id: true } })
  if (!existing) throw createHttpError(404, 'Không tìm thấy cảnh báo trong phạm vi được cấp quyền.')
  const receipt = await prisma.alertRead.upsert({
    where: { alertId_userId: { alertId: existing.id, userId: operation.actor.id } },
    create: { alertId: existing.id, userId: operation.actor.id, readAt: new Date() },
    update: {},
  })
  return { id: existing.id, isRead: true, readAt: receipt.readAt }
}


function assignmentInput(operation, allowed) {
  const body = operation.input
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw createHttpError(400, 'Dữ liệu phân công không hợp lệ.')
  if (!Number.isInteger(body.assignmentVersion) || body.assignmentVersion < 0 || body.assignmentVersion >= 2147483647) throw createHttpError(400, 'assignmentVersion phải là số nguyên không âm hợp lệ.')
  return body
}
function assignmentManager(role) { return ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER'].includes(role) }
async function lockedAlertContext(tx, operation, version, targetId = null) {
  const where = environmentalAlertWhere(operation, operation.alertId)
  await tx.$queryRaw`SELECT id FROM alerts_notifications WHERE id = ${operation.alertId}::uuid AND farm_id = ${operation.farmId}::uuid FOR UPDATE`
  let alert = await tx.alertNotification.findFirst({ where, include: alertInclude(operation.actor.id) })
  if (!alert) throw createHttpError(404, 'Không tìm thấy cảnh báo trong phạm vi được cấp quyền.')
  await tx.$queryRaw`SELECT id FROM farms WHERE id = ${operation.farmId}::uuid FOR SHARE`
  if (alert.tankId || alert.tank?.id) {
    const tankId = alert.tankId || alert.tank.id
    await tx.$queryRaw`SELECT id FROM ponds_tanks WHERE id = ${tankId}::uuid FOR SHARE`
    alert = await tx.alertNotification.findFirst({ where, include: alertInclude(operation.actor.id) })
    if (!alert) throw createHttpError(404, 'Cảnh báo đã thay đổi phạm vi được cấp quyền.')
  }
  for (const userId of [...new Set([operation.actor.id, targetId].filter(Boolean))].sort()) {
    await tx.$queryRaw`SELECT user_id FROM farm_members WHERE farm_id = ${operation.farmId}::uuid AND user_id = ${userId} FOR SHARE`
  }
  const actor = isSystemAdmin(operation.actor)
    ? { userId: operation.actor.id, role: 'OWNER', status: 'active', farm: await tx.farm.findUnique({ where: { id: operation.farmId }, select: { status: true } }) }
    : await tx.farmMember.findFirst({ where: { farmId: operation.farmId, userId: operation.actor.id }, include: { farm: { select: { status: true } } } })
  if (!eligibleMembership(actor, alert.tank?.areaId) || (actor.farm && actor.farm.status !== 'active')) throw createHttpError(403, 'Thành viên không còn quyền xử lý cảnh báo trong phạm vi này.')
  if (alert.assignmentVersion !== version) throw createHttpError(409, 'Phân công đã thay đổi; vui lòng tải lại.')
  if (alert.status === 'resolved') throw createHttpError(409, 'Cảnh báo đã kết thúc.')
  return { alert, actor }
}
async function mutateAssignment(operation, input, action) {
  const item = await prisma.$transaction(async tx => {
    const context = await lockedAlertContext(tx, operation, input.assignmentVersion, input.responsibleUserId)
    await action(tx, context)
    const updated = await tx.alertNotification.findFirst({ where: { id: context.alert.id, farmId: operation.farmId }, include: alertDetailInclude(operation.actor.id) })
    return personalAlert(updated)
  })
  return item
}
export async function listEnvironmentalAlertAssignees(operation) {
  const where = environmentalAlertWhere(operation, operation.alertId)
  if (!assignmentManager(operation.membership.role)) throw createHttpError(403, 'Chỉ quản lý được xem danh sách giao việc.')
  const alert = await prisma.alertNotification.findFirst({ where, include: { tank: { select: { areaId: true } } } })
  if (!alert) throw createHttpError(404, 'Không tìm thấy cảnh báo trong phạm vi được cấp quyền.')
  const members = await eligibleAlertMembers(prisma, operation.farmId, alert.tank?.areaId, operation.actor.id)
  return { items: members.map(member => ({ ...member.user, role: member.role })) }
}
export async function assignEnvironmentalAlert(operation) {
  const input = assignmentInput(operation, ['responsibleUserId', 'assignmentVersion'])
  if (typeof input.responsibleUserId !== 'string' || !input.responsibleUserId.trim() || input.responsibleUserId.length > 255) throw createHttpError(400, 'Người phụ trách không hợp lệ.')
  return mutateAssignment(operation, input, async (tx, { alert, actor }) => {
    if (!assignmentManager(actor.role)) throw createHttpError(403, 'Chỉ quản lý được giao lại cảnh báo.')
    if (input.responsibleUserId === operation.actor.id) throw createHttpError(400, 'Không được giao cảnh báo cho chính mình.')
    const member = await tx.farmMember.findFirst({ where: { farmId: operation.farmId, userId: input.responsibleUserId } })
    if (!eligibleAlertWorker(member, alert.tank?.areaId)) throw createHttpError(400, 'Người được giao phải là thành viên hoạt động đúng phạm vi.')
    await tx.alertNotification.update({ where: { id: alert.id }, data: { responsibleUserId: input.responsibleUserId, assignedBy: operation.actor.id, assignedAt: new Date(), acceptedAt: null, assignmentVersion: { increment: 1 } } })
    await createAssignmentNotification(tx, { id: alert.id, farmId: operation.farmId, responsibleUserId: input.responsibleUserId, assignmentVersion: alert.assignmentVersion + 1 })
  })
}
export async function claimEnvironmentalAlert(operation) {
  const input = assignmentInput(operation, ['assignmentVersion'])
  return mutateAssignment(operation, input, async (tx, { alert, actor }) => {
    if (!eligibleAlertWorker(actor, alert.tank?.areaId)) throw createHttpError(403, 'Chỉ nhân viên kỹ thuật hoặc quản lý khu vực đúng khu vực được nhận và xử lý cảnh báo.')
    if (alert.responsibleUserId && alert.responsibleUserId !== operation.actor.id) throw createHttpError(403, 'Không được nhận việc đã giao cho người khác.')
    if (alert.responsibleUserId === operation.actor.id && alert.acceptedAt) return
    const now = new Date()
    await tx.alertNotification.update({ where: { id: alert.id }, data: { responsibleUserId: operation.actor.id, ...(alert.responsibleUserId !== operation.actor.id ? { assignedBy: operation.actor.id, assignedAt: now } : {}), acceptedAt: now, status: 'in_progress', ...(!alert.handlingNotes || !alert.handledBy || !alert.handledAt ? { handlingNotes: 'Đã nhận xử lý cảnh báo.', handledBy: operation.actor.id, handledAt: now } : {}), assignmentVersion: { increment: 1 } } })
  })
}
export async function updateEnvironmentalAlertStatus(operation) {
  const input = assignmentInput(operation, ['status', 'notes', 'assignmentVersion'])
  if (!['in_progress', 'resolved'].includes(input.status)) throw createHttpError(400, 'Trạng thái phải là đang xử lý hoặc đã xử lý.')
  if (typeof input.notes !== 'string' || !input.notes.trim() || input.notes.trim().length > 4000) throw createHttpError(400, 'Ghi chú xử lý phải có từ 1 đến 4.000 ký tự.')
  return mutateAssignment(operation, input, async (tx, { alert, actor }) => {
    if (!eligibleAlertWorker(actor, alert.tank?.areaId)) throw createHttpError(403, 'Chỉ nhân viên kỹ thuật hoặc quản lý khu vực đúng khu vực được nhận và xử lý cảnh báo.')
    if (alert.responsibleUserId !== operation.actor.id || !alert.acceptedAt) throw createHttpError(403, 'Chỉ người phụ trách đã nhận việc được cập nhật xử lý.')
    await tx.alertNotification.update({ where: { id: alert.id }, data: { status: input.status, handlingNotes: input.notes.trim(), handledBy: operation.actor.id, handledAt: new Date(), assignmentVersion: { increment: 1 } } })
  })
}
