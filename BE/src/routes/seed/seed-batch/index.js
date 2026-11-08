import { Router } from 'express'
import { requireAuth } from '../../../middlewares/auth.middleware.js'
import { registerListSeedBatches, registerListQualityHistory, registerGetSeedBatch, registerListAiInspections } from './get.js'
import { registerCreateSeedBatch, registerCreateAiInspectionUploadSignature, registerCreateAiInspection, registerAnalyzeAiInspection } from './post.js'
import { registerUpdateSeedBatchStatus, registerUpdateSeedBatch } from './patch.js'

export const seedBatchRouter = Router({ mergeParams: true })
seedBatchRouter.use(requireAuth)
registerListSeedBatches(seedBatchRouter)
registerListQualityHistory(seedBatchRouter)
registerGetSeedBatch(seedBatchRouter)
registerCreateSeedBatch(seedBatchRouter)
registerListAiInspections(seedBatchRouter)
registerCreateAiInspectionUploadSignature(seedBatchRouter)
registerCreateAiInspection(seedBatchRouter)
registerAnalyzeAiInspection(seedBatchRouter)
registerUpdateSeedBatchStatus(seedBatchRouter)
registerUpdateSeedBatch(seedBatchRouter)
