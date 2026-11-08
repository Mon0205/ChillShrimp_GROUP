import { listQualityHistory } from '../../../controllers/seed/quality-history/index.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireSeedBatchViewer } from '../../../middlewares/auth.middleware.js'
import { getSeedBatch, listSeedBatches } from '../../../controllers/seed/seed-batch/index.js'
import { listAiInspections } from '../../../controllers/seed/ai-inspection/index.js'

export function registerListSeedBatches(router) {
  router.get('/', requireSeedBatchViewer, asyncHandler(listSeedBatches))
}

export function registerListQualityHistory(router) {
  router.get('/inspection-history', requireSeedBatchViewer, asyncHandler(listQualityHistory))
}

export function registerGetSeedBatch(router) {
  router.get('/:batchId', requireSeedBatchViewer, asyncHandler(getSeedBatch))
}

export function registerListAiInspections(router) {
  router.get('/:batchId/ai-inspections', requireSeedBatchViewer, asyncHandler(listAiInspections))
}
