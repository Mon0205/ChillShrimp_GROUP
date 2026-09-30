import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireSeedBatchManager, requireSeedBatchViewer } from '../middlewares/auth.middleware.js'
import { createBatchQuantityEvent, createGrowthSamplingLog, createSeedBatch, createSeedBatchUploadSignature, getBatchQuantityEvents, getGrowthSamplingLogs, getSeedBatch, listSeedBatches, updateSeedBatch, updateSeedBatchStatus } from '../controllers/seed-batch.controller.js'
import { createQualityUploadSignature, createSeedQualityCheck, listSeedQualityChecks, reviewSeedQualityCheck } from '../controllers/seed-quality-check.controller.js'

export const seedBatchRouter = Router({ mergeParams: true })
seedBatchRouter.use(requireAuth)
seedBatchRouter.get('/', requireSeedBatchViewer, asyncHandler(listSeedBatches))
seedBatchRouter.get('/:batchId', requireSeedBatchViewer, asyncHandler(getSeedBatch))
seedBatchRouter.get('/:batchId/quantity-events', requireSeedBatchViewer, asyncHandler(getBatchQuantityEvents))
seedBatchRouter.post('/:batchId/quantity-events', requireSeedBatchViewer, asyncHandler(createBatchQuantityEvent))
seedBatchRouter.get('/:batchId/growth-samples', requireSeedBatchViewer, asyncHandler(getGrowthSamplingLogs))
seedBatchRouter.post('/:batchId/growth-samples', requireSeedBatchViewer, asyncHandler(createGrowthSamplingLog))
seedBatchRouter.post('/', requireSeedBatchManager, asyncHandler(createSeedBatch))
seedBatchRouter.post('/attachments/upload-signature', requireSeedBatchManager, asyncHandler(createSeedBatchUploadSignature))
seedBatchRouter.get('/:batchId/quality-checks', requireSeedBatchViewer, asyncHandler(listSeedQualityChecks))
seedBatchRouter.post('/:batchId/quality-checks/upload-signature', requireSeedBatchViewer, asyncHandler(createQualityUploadSignature))
seedBatchRouter.post('/:batchId/quality-checks', requireSeedBatchViewer, asyncHandler(createSeedQualityCheck))
seedBatchRouter.patch('/:batchId/quality-checks/:checkId/review', requireSeedBatchViewer, asyncHandler(reviewSeedQualityCheck))
seedBatchRouter.patch('/:batchId/status', requireSeedBatchManager, asyncHandler(updateSeedBatchStatus))
seedBatchRouter.patch('/:batchId', requireSeedBatchViewer, asyncHandler(updateSeedBatch))
