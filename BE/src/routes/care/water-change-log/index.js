import { Router } from 'express'
import { requireAuth, requireCareLogAccess } from '../../../middlewares/auth.middleware.js'
import { registerListWaterChangeLogs } from './get.js'
import { registerCreateWaterChangeLog } from './post.js'

export const waterChangeLogRouter = Router({ mergeParams: true })
waterChangeLogRouter.use(requireAuth, requireCareLogAccess)
registerListWaterChangeLogs(waterChangeLogRouter)
registerCreateWaterChangeLog(waterChangeLogRouter)
