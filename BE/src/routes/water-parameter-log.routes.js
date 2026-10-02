import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireCareLogAccess } from '../middlewares/auth.middleware.js'
import { createWaterParameterLog, listWaterParameterLogs } from '../controllers/water-parameter-log.controller.js'

export const waterParameterLogRouter = Router({ mergeParams: true })
waterParameterLogRouter.use(requireAuth, requireCareLogAccess)
waterParameterLogRouter.get('/', asyncHandler(listWaterParameterLogs))
waterParameterLogRouter.post('/', asyncHandler(createWaterParameterLog))
