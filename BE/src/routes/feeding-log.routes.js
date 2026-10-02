import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireFeedingAccess } from '../middlewares/auth.middleware.js'
import { createFeedingLog, getFeedingRecommendation, listFeedingLogs } from '../controllers/feeding-log.controller.js'

export const feedingLogRouter = Router({ mergeParams: true })
feedingLogRouter.use(requireAuth, requireFeedingAccess)
feedingLogRouter.get('/', asyncHandler(listFeedingLogs))
feedingLogRouter.get('/recommendation', asyncHandler(getFeedingRecommendation))
feedingLogRouter.post('/', asyncHandler(createFeedingLog))
