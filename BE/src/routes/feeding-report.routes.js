import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireFeedingAccess } from '../middlewares/auth.middleware.js'
import { getFeedingReport } from '../controllers/feeding-report.controller.js'

export const feedingReportRouter = Router({ mergeParams: true })
feedingReportRouter.use(requireAuth, requireFeedingAccess)
feedingReportRouter.get('/feeding', asyncHandler(getFeedingReport))
