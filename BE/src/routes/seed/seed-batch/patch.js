import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireSeedBatchManager, requireSeedBatchViewer } from '../../../middlewares/auth.middleware.js'
import { updateSeedBatch, updateSeedBatchStatus } from '../../../controllers/seed/seed-batch/index.js'

export function registerUpdateSeedBatchStatus(router) {
  router.patch('/:batchId/status', requireSeedBatchManager, asyncHandler(updateSeedBatchStatus))
}

export function registerUpdateSeedBatch(router) {
  router.patch('/:batchId', requireSeedBatchViewer, asyncHandler(updateSeedBatch))
}
