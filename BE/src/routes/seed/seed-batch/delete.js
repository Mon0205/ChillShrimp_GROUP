import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireSeedBatchViewer } from '../../../middlewares/auth.middleware.js'
import { deleteAiInspection } from '../../../controllers/seed/ai-inspection/index.js'

export function registerDeleteAiInspection(router) {
  router.delete('/:batchId/ai-inspections/:inspectionId', requireSeedBatchViewer, asyncHandler(deleteAiInspection))
}
