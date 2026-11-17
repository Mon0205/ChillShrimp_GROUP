import { Router } from 'express'
import { requireAuth } from '../../../middlewares/auth.middleware.js'
import { registerListSeedBatches, registerListQualityHistory, registerGetSeedBatch, registerListAiInspections } from './get.js'
import { registerCreateSeedBatch, registerCreateAiInspectionUploadSignature, registerCreateAiInspection, registerAnalyzeAiInspection } from './post.js'
import { registerUpdateSeedBatchStatus, registerUpdateSeedBatch, registerUpdateAiInspection } from './patch.js'
import { registerDeleteAiInspection } from './delete.js'

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
registerUpdateAiInspection(seedBatchRouter)
registerDeleteAiInspection(seedBatchRouter)
registerUpdateSeedBatchStatus(seedBatchRouter)
registerUpdateSeedBatch(seedBatchRouter)
