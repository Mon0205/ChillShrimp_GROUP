import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'
import { eligibleAlertWorker } from './alert-responsibility.service.js'

export async function createAssignmentNotification(tx, alert) {
  if (!alert.responsibleUserId) return
  const key = { alertId: alert.id, recipientId: alert.responsibleUserId, assignmentVersion: alert.assignmentVersion }
  await tx.alertAssignmentNotification.upsert({
    where: { alertId_recipientId_assignmentVersion: key },
    create: { ...key, farmId: alert.farmId },
    update: {},
  })
}

const include = { alert: { select: { id: true, title: true, severity: true, status: true, responsibleUserId: true, tankId: true, tank: { select: { id: true, code: true, name: true, areaId: true } } } } }
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function pagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page), limit = query.limit === undefined ? 5 : Number(query.limit)
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100 || (page-1)*limit > 2147483647) throw createHttpError(400, 'Trang hoặc số dòng không hợp lệ.')
  if (query.isRead !== undefined && !['true','false'].includes(query.isRead)) throw createHttpError(400, 'isRead phải là true hoặc false.')
  return { page, limit, skip: (page-1)*limit }
}
async function personalScope(tx, operation) {
  const member = await tx.farmMember.findFirst({ where: { farmId: operation.farmId, userId: operation.actor.id }, include: { farm: { select: { status: true } } } })
  if (!eligibleAlertWorker(member, member?.areaId) || member.farm?.status !== 'active') return null
  return {
    farmId: operation.farmId, recipientId: operation.actor.id,
    farm: { is: { status: 'active', members: { some: { userId: operation.actor.id, status: 'active', areaId: member.areaId, role: { in: ['technician','area_manager'] } } } } },
    alert: { is: { farmId: operation.farmId, alertType: 'environment_threshold', responsibleUserId: operation.actor.id, tank: { is: { farmId: operation.farmId, areaId: member.areaId } } } },
  }
}
function serialize(item) {
  const { farmId, recipientId, ...notification } = item
  return { ...notification, isRead: Boolean(item.readAt), title: 'Bạn được giao xử lý cảnh báo', message: `${item.alert.tank.name} (${item.alert.tank.code}): ${item.alert.title}` }
}
export async function listAlertAssignmentNotifications(operation) {
  const { page, limit, skip } = pagination(operation.filters)
  const result = await prisma.$transaction(async tx => {
    const scope = await personalScope(tx, operation)
    if (!scope) return { items: [], unreadCount: 0, pagination: { page, limit, total: 0, pageCount: 0 } }
    const where = { ...scope, ...(operation.filters.isRead === 'true' ? { readAt: { not: null } } : operation.filters.isRead === 'false' ? { readAt: null } : {}) }
    const [items, total, unreadCount] = await Promise.all([
      tx.alertAssignmentNotification.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take: limit }),
      tx.alertAssignmentNotification.count({ where }),
      tx.alertAssignmentNotification.count({ where: { ...scope, readAt: null } }),
    ])
    return { items: items.map(serialize), unreadCount, pagination: { page, limit, total, pageCount: Math.ceil(total/limit) } }
  })
  return result
}
export async function markAlertAssignmentNotificationRead(operation) {
  const id = operation.notificationId
  if (!uuidPattern.test(id || '')) throw createHttpError(400, 'Mã thông báo không hợp lệ.')
  const result = await prisma.$transaction(async tx => {
    const scope = await personalScope(tx, operation)
    if (!scope) throw createHttpError(404, 'Không tìm thấy thông báo cá nhân trong phạm vi được cấp quyền.')
    const initial = await tx.alertAssignmentNotification.findFirst({ where: { id, ...scope }, include })
    if (!initial) throw createHttpError(404, 'Không tìm thấy thông báo cá nhân trong phạm vi được cấp quyền.')
    await tx.$queryRaw`SELECT id FROM alerts_notifications WHERE id = ${initial.alertId}::uuid FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM farms WHERE id = ${operation.farmId}::uuid FOR SHARE`
    const tankId = initial.alert.tankId || initial.alert.tank.id
    await tx.$queryRaw`SELECT id FROM ponds_tanks WHERE id = ${tankId}::uuid FOR SHARE`
    await tx.$queryRaw`SELECT user_id FROM farm_members WHERE farm_id = ${operation.farmId}::uuid AND user_id = ${operation.actor.id} FOR SHARE`
    const freshScope = await personalScope(tx, operation)
    if (!freshScope) throw createHttpError(404, 'Không tìm thấy thông báo cá nhân trong phạm vi được cấp quyền.')
    const current = await tx.alertAssignmentNotification.findFirst({ where: { id, ...freshScope }, include })
    if (!current) throw createHttpError(404, 'Không tìm thấy thông báo cá nhân trong phạm vi được cấp quyền.')
    if (current.readAt) return { id, isRead: true, readAt: current.readAt }
    const readAt = new Date()
    await tx.alertAssignmentNotification.updateMany({ where: { id, ...freshScope, readAt: null }, data: { readAt } })
    return { id, isRead: true, readAt }
  })
  return result
}
