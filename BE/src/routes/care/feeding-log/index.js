import { Router } from 'express'
import { requireAuth, requireFeedingAccess } from '../../../middlewares/auth.middleware.js'
import { registerListFeedingLogs } from './get.js'
import { registerCreateFeedingLog } from './post.js'

export const feedingLogRouter = Router({ mergeParams: true })
feedingLogRouter.use(requireAuth, requireFeedingAccess)
registerListFeedingLogs(feedingLogRouter)
registerCreateFeedingLog(feedingLogRouter)
