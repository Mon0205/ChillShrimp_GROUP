import { Router } from 'express'
import { listQualityHistory } from '../controllers/quality-history.controller.js'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireSeedBatchManager, requireSeedBatchViewer } from '../middlewares/auth.middleware.js'
import { createSeedBatch, getSeedBatch, listSeedBatches, updateSeedBatch, updateSeedBatchStatus } from '../controllers/seed-batch.controller.js'
import { analyzeAiInspection, createAiInspection, createAiInspectionUploadSignature, listAiInspections } from '../controllers/ai-inspection.controller.js'

export const seedBatchRouter = Router({ mergeParams: true })
seedBatchRouter.use(requireAuth)
seedBatchRouter.get('/', requireSeedBatchViewer, asyncHandler(listSeedBatches))
seedBatchRouter.get('/inspection-history', requireSeedBatchViewer, asyncHandler(listQualityHistory))
seedBatchRouter.get('/:batchId', requireSeedBatchViewer, asyncHandler(getSeedBatch))
seedBatchRouter.post('/', requireSeedBatchManager, asyncHandler(createSeedBatch))
seedBatchRouter.get('/:batchId/ai-inspections', requireSeedBatchViewer, asyncHandler(listAiInspections))
seedBatchRouter.post('/:batchId/ai-inspections/upload-signature', requireSeedBatchViewer, asyncHandler(createAiInspectionUploadSignature))
seedBatchRouter.post('/:batchId/ai-inspections', requireSeedBatchViewer, asyncHandler(createAiInspection))
seedBatchRouter.post('/:batchId/ai-inspections/:inspectionId/analyze', requireSeedBatchViewer, asyncHandler(analyzeAiInspection))
seedBatchRouter.patch('/:batchId/status', requireSeedBatchManager, asyncHandler(updateSeedBatchStatus))
seedBatchRouter.patch('/:batchId', requireSeedBatchViewer, asyncHandler(updateSeedBatch))
