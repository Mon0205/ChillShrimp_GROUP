import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireSeedBatchManager, requireSeedBatchViewer } from '../../../middlewares/auth.middleware.js'
import { createSeedBatch } from '../../../controllers/seed/seed-batch/index.js'
import { analyzeAiInspection, createAiInspection, createAiInspectionUploadSignature } from '../../../controllers/seed/ai-inspection/index.js'

export function registerCreateSeedBatch(router) {
  router.post('/', requireSeedBatchManager, asyncHandler(createSeedBatch))
}

export function registerCreateAiInspectionUploadSignature(router) {
  router.post('/:batchId/ai-inspections/upload-signature', requireSeedBatchViewer, asyncHandler(createAiInspectionUploadSignature))
}

export function registerCreateAiInspection(router) {
  router.post('/:batchId/ai-inspections', requireSeedBatchViewer, asyncHandler(createAiInspection))
}

export function registerAnalyzeAiInspection(router) {
  router.post('/:batchId/ai-inspections/:inspectionId/analyze', requireSeedBatchViewer, asyncHandler(analyzeAiInspection))
}
