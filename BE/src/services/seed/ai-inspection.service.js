import { randomUUID } from 'node:crypto'
import { createUploadSignature, deleteCloudinaryAsset, getOwnedCloudinaryAsset } from '../../config/cloudinary.js'
import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'

const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SAMPLING_METHODS = ['manual', 'ai', 'combined']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function validateUuid(value, label) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw createHttpError(400, `${label} không hợp lệ.`)
  return value
}

function getScopedTankWhere(context) {
  if (!['OWNER', 'FARM_MANAGER'].includes(context.membership.role) && !context.membership.areaId) {
    throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
  }
  return {
    farmId: context.farmId,
    ...(['OWNER', 'FARM_MANAGER'].includes(context.membership.role) ? {} : { areaId: context.membership.areaId }),
  }
}

async function findBatch(context) {
  const batchId = validateUuid(context.batchId, 'Mã lô giống')
  const batch = await prisma.seedBatch.findFirst({
    where: { id: batchId, tank: getScopedTankWhere(context) },
    select: { id: true, batchCode: true, tank: { select: { id: true, name: true, code: true } } },
  })
  if (!batch) throw createHttpError(404, 'Không tìm thấy lô giống trong phạm vi được cấp quyền.')
  return batch
}

export async function createAiInspectionUploadSignature(context) {
  const batch = await findBatch(context)
  const folder = `chillshrimp/farms/${context.farmId}/seed-batches/${batch.id}/ai-inspections`
  const publicId = randomUUID()
  const signed = createUploadSignature({ folder, publicId, allowedFormats: IMAGE_FORMATS.join(',') })
  return { ...signed, folder, publicId, resourceType: 'image', maxBytes: MAX_IMAGE_BYTES }
}

export async function listAiInspections(context) {
  const batch = await findBatch(context)
  const limit = context.filters.limit === undefined ? 50 : Number(context.filters.limit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createHttpError(400, 'limit phải là số nguyên từ 1 đến 100.')
  }
  const items = await prisma.aiInspection.findMany({
    where: { batchId: batch.id },
    select: {
      id: true,
      batchId: true,
      mediaUrl: true,
      annotatedImageUrl: true,
      samplingMethod: true,
      sampleVolumeMl: true,
      manualCount: true,
      detectedCount: true,
      densityPerMl: true,
      correctionFactor: true,
      averageConfidence: true,
      averageSizeMm: true,
      uniformityScore: true,
      detections: true,
      photoWarnings: true,
      modelVersion: true,
      status: true,
      inspectedAt: true,
      notes: true,
      createdAt: true,
      creator: { select: { id: true, displayName: true } },
    },
    orderBy: [
      { inspectedAt: { sort: 'desc', nulls: 'last' } },
      { createdAt: 'desc' },
    ],
    take: limit,
  })
  return { batch, items }
}

function parseSampleVolume(value) {
  if (value === undefined || value === null || value === '') return null
  const volume = Number(value)
  // The column keeps 3 decimals: smaller values would be stored as 0 and blow up the density.
  if (!Number.isFinite(volume) || volume < 0.001 || volume > 1000000) {
    throw createHttpError(400, 'sampleVolumeMl phải từ 0,001 đến 1.000.000 ml.')
  }
  return Number(volume.toFixed(3))
}

const densityFrom = (count, volume) => (volume && count != null ? Number((count / Number(volume)).toFixed(4)) : null)

// Who may review or delete an inspection: managers in scope, or the person who created it.
// findBatch already limits Area Managers and Technicians to their own area.
async function findChangeableInspection(context, batch, id) {
  const inspection = await prisma.aiInspection.findFirst({ where: { id, batchId: batch.id } })
  if (!inspection) throw createHttpError(404, 'Không tìm thấy lần kiểm tra AI trong lô giống này.')
  const isManager = ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER'].includes(context.membership.role)
  if (!isManager && inspection.createdBy !== context.actor.id) {
    throw createHttpError(403, 'Chỉ người tạo lần kiểm tra hoặc người quản lý được thay đổi lần kiểm tra này.')
  }
  return inspection
}

// Completed inspections are kept for traceability (AI result, photo, model version);
// only uploads that never produced a result can be removed.
const DELETABLE_STATUSES = ['pending', 'failed']

export async function deleteAiInspection(context) {
  const batch = await findBatch(context)
  const id = validateUuid(context.inspectionId, 'Mã lần kiểm tra')
  const inspection = await findChangeableInspection(context, batch, id)
  if (!DELETABLE_STATUSES.includes(inspection.status)) {
    throw createHttpError(409, 'Chỉ xóa được lần kiểm tra chưa có kết quả (chờ phân tích hoặc lỗi).')
  }
  // Conditional delete: an analysis that starts in between moves the row to processing and wins.
  const deleted = await prisma.aiInspection.deleteMany({ where: { id, status: { in: DELETABLE_STATUSES } } })
  if (!deleted.count) throw createHttpError(409, 'Lần kiểm tra vừa được phân tích; không thể xóa.')
  try {
    await deleteCloudinaryAsset({ resourceType: 'image', publicId: inspection.mediaPublicId })
  } catch (error) {
    // The record is gone either way; a leftover image only costs storage.
    console.error('AI inspection image could not be removed from Cloudinary:', inspection.mediaPublicId, error)
  }
  return { id }
}

// Human review after analysis: a confirmed count stored beside (never over) the AI count,
// and a sample volume that may have been forgotten at upload; density is recomputed from the AI count.
export async function updateAiInspection(context) {
  const batch = await findBatch(context)
  const id = validateUuid(context.inspectionId, 'Mã lần kiểm tra')
  const input = context.input
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw createHttpError(400, 'Dữ liệu cập nhật không hợp lệ.')
  const unknown = Object.keys(input).filter((key) => !['manualCount', 'sampleVolumeMl'].includes(key))
  if (unknown.length) throw createHttpError(400, `Trường không được hỗ trợ: ${unknown.join(', ')}.`)
  if (!('manualCount' in input) && !('sampleVolumeMl' in input)) throw createHttpError(400, 'Không có thông tin để cập nhật.')

  const inspection = await findChangeableInspection(context, batch, id)
  if (inspection.status !== 'completed') throw createHttpError(409, 'Chỉ cập nhật được sau khi AI phân tích xong.')

  const data = {}
  if ('manualCount' in input) {
    if (input.manualCount === null || input.manualCount === '') data.manualCount = null
    else {
      const count = Number(input.manualCount)
      if (!Number.isSafeInteger(count) || count < 0 || count > 1000000) throw createHttpError(400, 'Số đếm xác nhận phải là số nguyên từ 0 đến 1.000.000.')
      data.manualCount = count
    }
  }
  if ('sampleVolumeMl' in input) {
    data.sampleVolumeMl = parseSampleVolume(input.sampleVolumeMl)
    data.densityPerMl = densityFrom(inspection.detectedCount, data.sampleVolumeMl)
  }
  return prisma.aiInspection.update({ where: { id }, data, include: { creator: { select: { id: true, displayName: true } } } })
}

export async function createAiInspection(context) {
  const batch = await findBatch(context)
  if (!context.input || typeof context.input !== 'object' || Array.isArray(context.input)) throw createHttpError(400, 'Dữ liệu ảnh kiểm tra không hợp lệ.')
  const allowedFields = ['mediaPublicId', 'samplingMethod', 'sampleVolumeMl', 'notes']
  const unknown = Object.keys(context.input).filter((key) => !allowedFields.includes(key))
  if (unknown.length) throw createHttpError(400, `Trường không được hỗ trợ: ${unknown.join(', ')}.`)

  const { mediaPublicId, samplingMethod } = context.input
  validateUuid(mediaPublicId, 'Cloudinary public ID')
  if (!SAMPLING_METHODS.includes(samplingMethod)) throw createHttpError(400, 'samplingMethod không hợp lệ.')

  const sampleVolumeMl = parseSampleVolume(context.input.sampleVolumeMl)

  let notes = null
  if (context.input.notes !== undefined && context.input.notes !== null) {
    if (typeof context.input.notes !== 'string' || context.input.notes.trim().length > 4000) {
      throw createHttpError(400, 'notes phải là chuỗi không quá 4.000 ký tự.')
    }
    notes = context.input.notes.trim() || null
  }

  const folder = `chillshrimp/farms/${context.farmId}/seed-batches/${batch.id}/ai-inspections`
  const asset = await getOwnedCloudinaryAsset({
    resourceType: 'image',
    publicId: mediaPublicId,
    expectedFolder: folder,
    allowedFormats: IMAGE_FORMATS,
  })
  if (!asset) throw createHttpError(400, 'Ảnh không tồn tại, sai định dạng, vượt quá 10 MB hoặc không thuộc lô giống này.')

  const item = await prisma.aiInspection.create({
    data: {
      batchId: batch.id,
      createdBy: context.actor.id,
      mediaUrl: asset.secureUrl,
      mediaPublicId: asset.publicId,
      samplingMethod,
      sampleVolumeMl,
      notes,
      status: 'pending',
    },
    include: { creator: { select: { id: true, displayName: true } } },
  })
  return item
}

function validatePrediction(prediction) {
  if (!prediction || !Number.isSafeInteger(prediction.count) || prediction.count < 0 ||
      !Array.isArray(prediction.detections) || prediction.detections.length !== prediction.count) {
    throw new Error('AI returned an invalid detection count.')
  }
  let annotatedUrl
  try { annotatedUrl = new URL(prediction.annotated_image_url) } catch { /* checked below */ }
  if (annotatedUrl?.protocol !== 'https:' || annotatedUrl.hostname !== 'res.cloudinary.com') {
    throw new Error('AI did not return an annotated image.')
  }
  if (typeof prediction.model_version !== 'string' || prediction.model_version.length > 100) {
    throw new Error('AI did not return a valid model version.')
  }
  for (const detection of prediction.detections) {
    const box = detection?.box
    if (!Number.isInteger(detection?.class_id) || typeof detection.class !== 'string' ||
        !Number.isFinite(detection.confidence) || detection.confidence < 0 || detection.confidence > 1 ||
        !box || !['x1', 'y1', 'x2', 'y2'].every((key) => Number.isFinite(box[key]))) {
      throw new Error('AI returned an invalid detection.')
    }
  }
  return prediction
}

const WARNING_LEVELS = ['warning', 'info']
const MAX_PHOTO_WARNINGS = 20

// Photo warnings are advisory: a malformed entry is dropped, never fails the analysis.
// null (field missing) means an older AI_SERVICE that does not check photos.
function readPhotoWarnings(prediction) {
  if (!Array.isArray(prediction.photo_warnings)) return null
  return prediction.photo_warnings
    .filter((warning) => typeof warning?.code === 'string' && /^[a-z0-9_]{1,50}$/.test(warning.code) &&
      WARNING_LEVELS.includes(warning.level) &&
      typeof warning.message === 'string' && warning.message.length > 0 && warning.message.length <= 500)
    .slice(0, MAX_PHOTO_WARNINGS)
    .map(({ code, level, message }) => ({ code, level, message }))
}

export async function analyzeAiInspection(context) {
  const batch = await findBatch(context)
  const id = validateUuid(context.inspectionId, 'Mã lần kiểm tra')
  const inspection = await prisma.aiInspection.findFirst({ where: { id, batchId: batch.id } })
  if (!inspection) throw createHttpError(404, 'Không tìm thấy lần kiểm tra AI trong lô giống này.')
  if (inspection.status === 'completed') {
    const item = await prisma.aiInspection.findUnique({ where: { id }, include: { creator: { select: { id: true, displayName: true } } } })
    return item
  }

  const claimed = await prisma.aiInspection.updateMany({
    where: { id, status: { in: ['pending', 'failed'] } },
    data: { status: 'processing' },
  })
  if (!claimed.count) throw createHttpError(409, 'Lần kiểm tra AI đang được xử lý.')

  try {
    const imageResponse = await fetch(inspection.mediaUrl, {
      redirect: 'error', signal: AbortSignal.timeout(30000),
    })
    if (!imageResponse.ok) throw new Error('Could not load the original image from Cloudinary.')
    const imageBytes = Buffer.from(await imageResponse.arrayBuffer())
    if (!imageBytes.length || imageBytes.length > MAX_IMAGE_BYTES) throw new Error('The original image is empty or too large.')

    const form = new FormData()
    form.append('file', new Blob([imageBytes], { type: imageResponse.headers.get('content-type') || 'image/jpeg' }), `${id}.jpg`)
    const baseUrl = (process.env.AI_SERVICE_URL || 'http://localhost:8001').replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/predict?save_original=false`, {
      method: 'POST', body: form, signal: AbortSignal.timeout(180000),
    })
    if (!response.ok) throw new Error(`AI Service returned HTTP ${response.status}.`)
    const prediction = validatePrediction(await response.json())
    const averageConfidence = prediction.count
      ? Number((prediction.detections.reduce((sum, detection) => sum + detection.confidence, 0) / prediction.count).toFixed(5))
      : null
    const densityPerMl = densityFrom(prediction.count, inspection.sampleVolumeMl)
    const item = await prisma.aiInspection.update({
      where: { id },
      data: {
        detectedCount: prediction.count,
        detections: prediction.detections,
        photoWarnings: readPhotoWarnings(prediction),
        annotatedImageUrl: prediction.annotated_image_url,
        modelVersion: prediction.model_version,
        averageConfidence,
        densityPerMl,
        inspectedAt: new Date(),
        status: 'completed',
      },
      include: { creator: { select: { id: true, displayName: true } } },
    })
    return item
  } catch (error) {
    await prisma.aiInspection.update({ where: { id }, data: { status: 'failed' } })
    console.error('AI inspection analysis failed:', error)
    throw createHttpError(502, 'Không thể phân tích ảnh bằng AI. Ảnh gốc đã được lưu; hãy thử lại.')
  }
}
