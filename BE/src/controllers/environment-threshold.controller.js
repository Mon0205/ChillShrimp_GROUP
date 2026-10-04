import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { normalizeEnvironmentThresholdInput } from '../utils/environment-threshold.validation.js'

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

function environmentalAlertWhere(req, alertId) {
  if (req.membership.role !== 'owner' && !req.membership.areaId) throw createHttpError(403, 'Your account is not assigned to an area.')
  if (alertId && !ALERT_UUID_PATTERN.test(alertId)) throw createHttpError(400, 'Alert id is invalid.')
  return {
    ...(alertId ? { id: alertId } : {}),
    farmId: req.params.farmId,
    alertType: 'environment_threshold',
    ...(req.membership.role === 'owner' ? {} : { tank: { is: { areaId: req.membership.areaId } } }),
  }
}

export async function listEnvironmentThresholds(req, res) {
  const items = await prisma.environmentThreshold.findMany({
    where: { farmId: req.params.farmId },
    include: includeAudit,
    orderBy: [{ isActive: 'desc' }, { parameterCode: 'asc' }, { species: 'asc' }, { developmentStage: 'asc' }],
  })
  return sendData(res, items)
}

export async function createEnvironmentThreshold(req, res) {
  const input = normalizeInput(req.body)
  const item = await prisma.environmentThreshold.create({
    data: { ...toPrismaData(input), farmId: req.params.farmId, createdBy: req.auth.id },
    include: includeAudit,
  })
  return sendData(res, item, 201)
}

export async function updateEnvironmentThreshold(req, res) {
  const input = normalizeInput(req.body)
  const existing = await prisma.environmentThreshold.findFirst({
    where: { id: req.params.thresholdId, farmId: req.params.farmId },
    select: { id: true, approvedAt: true },
  })
  if (!existing) throw createHttpError(404, 'Environmental threshold not found in this farm.')

  if (existing.approvedAt) {
    const revision = await prisma.environmentThreshold.create({
      data: { ...toPrismaData(input), farmId: req.params.farmId, createdBy: req.auth.id },
      include: includeAudit,
    })
    return sendData(res, revision, 201)
  }

  const item = await prisma.environmentThreshold.update({
    where: { id: existing.id },
    data: { ...toPrismaData(input), isActive: false, approvedBy: null, approvedAt: null },
    include: includeAudit,
  })
  return sendData(res, item)
}

export async function approveEnvironmentThreshold(req, res) {
  const existing = await prisma.environmentThreshold.findFirst({
    where: { id: req.params.thresholdId, farmId: req.params.farmId },
    select: { id: true },
  })
  if (!existing) throw createHttpError(404, 'Environmental threshold not found in this farm.')

  const item = await prisma.environmentThreshold.update({
    where: { id: existing.id },
    data: { approvedBy: req.auth.id, approvedAt: new Date(), isActive: true },
    include: includeAudit,
  })
  return sendData(res, item)
}

export async function setEnvironmentThresholdStatus(req, res) {
  if (typeof req.body?.isActive !== 'boolean') throw createHttpError(400, 'isActive must be a boolean.')
  const existing = await prisma.environmentThreshold.findFirst({
    where: { id: req.params.thresholdId, farmId: req.params.farmId },
    select: { id: true, approvedAt: true },
  })
  if (!existing) throw createHttpError(404, 'Environmental threshold not found in this farm.')
  if (req.body.isActive && !existing.approvedAt) throw createHttpError(409, 'Approve the threshold before activating it.')

  const item = await prisma.environmentThreshold.update({
    where: { id: existing.id },
    data: { isActive: req.body.isActive },
    include: includeAudit,
  })
  return sendData(res, item)
}

export async function listEnvironmentalAlerts(req, res) {
  const page = req.query.page === undefined ? 1 : Number(req.query.page)
  const limit = req.query.limit === undefined ? 20 : Number(req.query.limit)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createHttpError(400, 'page must be positive and limit must be between 1 and 100.')
  }
  const where = environmentalAlertWhere(req)
  if (req.query.severity !== undefined && req.query.severity !== '') {
    if (!ENVIRONMENT_ALERT_SEVERITIES.has(req.query.severity)) throw createHttpError(400, 'severity must be warning or critical.')
    where.severity = req.query.severity
  }
  if (req.query.isRead !== undefined && req.query.isRead !== '') {
    if (!['true', 'false'].includes(req.query.isRead)) throw createHttpError(400, 'isRead must be true or false.')
    where.isRead = req.query.isRead === 'true'
  }
  const [items, total] = await prisma.$transaction([
    prisma.alertNotification.findMany({
      where,
      include: {
        tank: { select: { id: true, code: true, name: true } },
        batch: { select: { id: true, batchCode: true, species: true, developmentStage: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.alertNotification.count({ where }),
  ])
  return sendData(res, { items, pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
}

export async function getEnvironmentalAlert(req, res) {
  const where = environmentalAlertWhere(req, req.params.alertId)
  const item = await prisma.alertNotification.findFirst({
    where,
    include: {
      tank: { select: { id: true, code: true, name: true, areaId: true } },
      batch: { select: { id: true, batchCode: true, species: true, developmentStage: true } },
      threshold: { select: {
        id: true, species: true, developmentStage: true, tankType: true, parameterCode: true, unit: true,
        warningMin: true, warningMax: true, dangerMin: true, dangerMax: true,
        sourceReference: true, effectiveFrom: true, effectiveTo: true,
      } },
      sourceLog: { select: { id: true, recordedAt: true, measurementMethod: true, measurementDevice: true, notes: true } },
    },
  })
  if (!item) throw createHttpError(404, 'Environmental alert not found in your access scope.')
  return sendData(res, item)
}

export async function markEnvironmentalAlertRead(req, res) {
  const where = environmentalAlertWhere(req, req.params.alertId)
  const existing = await prisma.alertNotification.findFirst({ where, select: { id: true, isRead: true } })
  if (!existing) throw createHttpError(404, 'Environmental alert not found in your access scope.')
  if (existing.isRead) return sendData(res, existing)
  const item = await prisma.alertNotification.update({
    where: { id: existing.id },
    data: { isRead: true },
    include: {
      tank: { select: { id: true, code: true, name: true } },
      batch: { select: { id: true, batchCode: true, species: true, developmentStage: true } },
    },
  })
  return sendData(res, item)
}
