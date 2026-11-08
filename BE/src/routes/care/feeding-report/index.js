import { Router } from 'express'
import { requireAuth, requireFeedingAccess } from '../../../middlewares/auth.middleware.js'
import { registerGetFeedingReport } from './get.js'

export const feedingReportRouter = Router({ mergeParams: true })
feedingReportRouter.use(requireAuth, requireFeedingAccess)
registerGetFeedingReport(feedingReportRouter)
