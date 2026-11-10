import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireSeedBatchManager, requireSeedBatchViewer } from '../../../middlewares/auth.middleware.js'
import { updateSeedBatch, updateSeedBatchStatus } from '../../../controllers/seed/seed-batch/index.js'
import { updateAiInspection } from '../../../controllers/seed/ai-inspection/index.js'

export function registerUpdateAiInspection(router) {
  router.patch('/:batchId/ai-inspections/:inspectionId', requireSeedBatchViewer, asyncHandler(updateAiInspection))
}

export function registerUpdateSeedBatchStatus(router) {
  router.patch('/:batchId/status', requireSeedBatchManager, asyncHandler(updateSeedBatchStatus))
}

export function registerUpdateSeedBatch(router) {
  router.patch('/:batchId', requireSeedBatchViewer, asyncHandler(updateSeedBatch))
}
