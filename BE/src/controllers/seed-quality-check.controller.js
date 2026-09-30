import { randomUUID } from 'node:crypto'
import { createUploadSignature, getOwnedCloudinaryAsset } from '../config/cloudinary.js'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

const CHECK_TYPES = ['visual', 'deformity', 'salinity_stress', 'formalin_stress', 'microscopy', 'pcr']
const RESULTS = ['pass', 'warning', 'fail', 'inconclusive']
const DISEASE_CODES = ['WSSV', 'TSV', 'YHV', 'IMNV', 'IHHNV', 'AHPND', 'EHP']
const REVIEW_STATUSES = ['confirmed', 'action_required', 'resolved']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validateUuid(value, label) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw createHttpError(400, `${label} is invalid.`)
  return value
}

function boundedText(value, label, max, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw createHttpError(400, `${label} is required.`)
    return null
  }
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
    throw createHttpError(400, `${label} must be a non-empty string of at most ${max} characters.`)
  }
  return value.trim() || null
}

function count(value, label, sampleSize, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw createHttpError(400, `${label} is required for this test.`)
    return null
  }
  if (!Number.isSafeInteger(value) || value < 0 || value > sampleSize) {
    throw createHttpError(400, `${label} must be an integer between 0 and sampleSize.`)
  }
  return value
}

function timestamp(value) {
  if (value === undefined) return new Date()
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw createHttpError(400, 'checkedAt must be a valid ISO timestamp.')
  return new Date(value)
}

function scopedTankWhere(req) {
  if (req.membership.role !== 'owner' && !req.membership.areaId) throw createHttpError(403, 'Your account is not assigned to an area.')
  return {
    farmId: req.params.farmId,
    ...(req.membership.role === 'owner' ? {} : { areaId: req.membership.areaId }),
  }
}

async function findBatch(req, batchId) {
  validateUuid(batchId, 'Batch ID')
  const batch = await prisma.seedBatch.findFirst({
    where: { id: batchId, tank: scopedTankWhere(req) },
    select: { id: true, status: true, tank: { select: { code: true, name: true, areaId: true } } },
  })
  if (!batch) throw createHttpError(404, 'Seed batch not found in your authorized farm/area.')
  return batch
}

export async function listSeedQualityChecks(req, res) {
  const batch = await findBatch(req, req.params.batchId)
  const items = await prisma.seedQualityCheck.findMany({
    where: { batchId: batch.id },
    include: {
      checker: { select: { id: true, displayName: true, email: true } },
      reviewer: { select: { id: true, displayName: true, email: true } },
    },
    orderBy: [{ checkedAt: 'desc' }, { createdAt: 'desc' }],
  })
  return sendData(res, { batch, items })
}

export async function createQualityUploadSignature(req, res) {
  if (req.membership.role !== 'technician') throw createHttpError(403, 'Only a Technician can upload quality-check evidence.')
  const batch = await findBatch(req, req.params.batchId)
  const folder = `chillshrimp/farms/${req.params.farmId}/seed-batches/${batch.id}`
  const publicId = randomUUID()
  const signed = createUploadSignature({ folder, publicId })
  return sendData(res, { ...signed, folder, publicId, resourceType: 'auto', maxBytes: 10 * 1024 * 1024 })
}

export async function createSeedQualityCheck(req, res) {
  if (req.membership.role !== 'technician') throw createHttpError(403, 'Only a Technician can record a seed quality check.')
  const batch = await findBatch(req, req.params.batchId)
  const body = req.body
  const allowed = ['checkType', 'diseaseCode', 'sampleSize', 'liveCount', 'abnormalCount', 'testMethod', 'protocolParameters', 'result', 'labName', 'evidencePublicId', 'evidenceResourceType', 'checkedAt', 'notes']
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key))
  if (unknown.length) throw createHttpError(400, `Unsupported fields: ${unknown.join(', ')}.`)

  if (!CHECK_TYPES.includes(body.checkType)) throw createHttpError(400, 'checkType is invalid.')
  if (!Number.isSafeInteger(body.sampleSize) || body.sampleSize < 1) throw createHttpError(400, 'sampleSize must be a positive integer.')
  if (!RESULTS.includes(body.result)) throw createHttpError(400, 'result is invalid.')
  const diseaseCode = boundedText(body.diseaseCode, 'diseaseCode', 20)
  if (body.checkType === 'pcr' && !DISEASE_CODES.includes(diseaseCode)) throw createHttpError(400, 'PCR checks require a supported diseaseCode.')
  if (diseaseCode && !DISEASE_CODES.includes(diseaseCode)) throw createHttpError(400, 'diseaseCode is invalid.')
  const liveCount = count(body.liveCount, 'liveCount', body.sampleSize, { required: ['salinity_stress', 'formalin_stress'].includes(body.checkType) })
  const abnormalCount = count(body.abnormalCount, 'abnormalCount', body.sampleSize)

  const evidencePublicId = boundedText(body.evidencePublicId, 'evidencePublicId', 100, { required: body.evidenceResourceType !== undefined })
  const evidenceResourceType = body.evidenceResourceType === undefined ? null : boundedText(body.evidenceResourceType, 'evidenceResourceType', 10, { required: true })
  let evidenceUrl = null
  let evidenceFormat = null
  if (evidencePublicId || evidenceResourceType) {
    if (!evidencePublicId || !['image', 'raw'].includes(evidenceResourceType) || !UUID_PATTERN.test(evidencePublicId)) {
      throw createHttpError(400, 'The uploaded Cloudinary asset reference is invalid.')
    }
    const folder = `chillshrimp/farms/${req.params.farmId}/seed-batches/${batch.id}`
    const asset = await getOwnedCloudinaryAsset({ resourceType: evidenceResourceType, publicId: evidencePublicId, expectedFolder: folder })
    if (!asset) throw createHttpError(400, 'The evidence file is missing, unsupported, too large, or does not belong to this batch.')
    evidenceUrl = asset.secureUrl
    evidenceFormat = asset.format
  }
  if (body.protocolParameters !== undefined && (body.protocolParameters === null || typeof body.protocolParameters !== 'object' || Array.isArray(body.protocolParameters))) {
    throw createHttpError(400, 'protocolParameters must be a JSON object.')
  }

  const row = await prisma.seedQualityCheck.create({
    data: {
      batchId: batch.id,
      checkedBy: req.auth.id,
      checkType: body.checkType,
      diseaseCode,
      sampleSize: body.sampleSize,
      liveCount,
      abnormalCount,
      survivalRate: liveCount === null ? null : Number(((liveCount / body.sampleSize) * 100).toFixed(2)),
      deformityRate: abnormalCount === null ? null : Number(((abnormalCount / body.sampleSize) * 100).toFixed(2)),
      testMethod: boundedText(body.testMethod, 'testMethod', 100, { required: true }),
      protocolParameters: body.protocolParameters ?? undefined,
      result: body.result,
      labName: boundedText(body.labName, 'labName', 150),
      evidenceUrl,
      evidencePublicId,
      evidenceFormat,
      checkedAt: timestamp(body.checkedAt),
      notes: boundedText(body.notes, 'notes', 4000),
    },
    include: { checker: { select: { id: true, displayName: true, email: true } } },
  })
  return sendData(res, row, 201)
}

export async function reviewSeedQualityCheck(req, res) {
  if (!['owner', 'area_manager'].includes(req.membership.role)) throw createHttpError(403, 'Only Owner or Area Manager can review quality checks.')
  const checkId = validateUuid(req.params.checkId, 'Quality check ID')
  const desiredStatus = req.body.reviewStatus
  if (!REVIEW_STATUSES.includes(desiredStatus)) throw createHttpError(400, 'reviewStatus is invalid.')
  const reviewNotes = boundedText(req.body.reviewNotes, 'reviewNotes', 4000)
  if (['action_required', 'resolved'].includes(desiredStatus) && !reviewNotes) throw createHttpError(400, 'reviewNotes are required for action or resolution.')

  const existing = await prisma.seedQualityCheck.findFirst({
    where: { id: checkId, batch: { tank: scopedTankWhere(req) } },
    select: { id: true, reviewStatus: true },
  })
  if (!existing) throw createHttpError(404, 'Quality check not found in your authorized farm/area.')
  const allowedTransitions = {
    pending: ['confirmed', 'action_required'],
    action_required: ['resolved'],
    confirmed: [],
    resolved: [],
  }
  if (!allowedTransitions[existing.reviewStatus]?.includes(desiredStatus)) {
    throw createHttpError(409, `Cannot change review status from ${existing.reviewStatus} to ${desiredStatus}.`)
  }

  const updated = await prisma.seedQualityCheck.updateMany({
    where: { id: existing.id, reviewStatus: existing.reviewStatus },
    data: { reviewStatus: desiredStatus, reviewedBy: req.auth.id, reviewedAt: new Date(), reviewNotes },
  })
  if (!updated.count) throw createHttpError(409, 'This quality check was reviewed by another user. Reload and try again.')
  const result = await prisma.seedQualityCheck.findUnique({
    where: { id: existing.id },
    include: { checker: { select: { id: true, displayName: true, email: true } }, reviewer: { select: { id: true, displayName: true, email: true } } },
  })
  return sendData(res, result)
}
