import { Router } from 'express'
import { requireAuth, requireCareLogAccess } from '../../../middlewares/auth.middleware.js'
import { registerListWaterParameterLogs } from './get.js'
import { registerCreateWaterParameterLog } from './post.js'

export const waterParameterLogRouter = Router({ mergeParams: true })
waterParameterLogRouter.use(requireAuth, requireCareLogAccess)
registerListWaterParameterLogs(waterParameterLogRouter)
registerCreateWaterParameterLog(waterParameterLogRouter)
