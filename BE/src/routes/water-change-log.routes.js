import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireCareLogAccess } from '../middlewares/auth.middleware.js'
import { createWaterChangeLog, listWaterChangeLogs } from '../controllers/water-change-log.controller.js'

export const waterChangeLogRouter = Router({ mergeParams: true })
waterChangeLogRouter.use(requireAuth, requireCareLogAccess)
waterChangeLogRouter.get('/', asyncHandler(listWaterChangeLogs))
waterChangeLogRouter.post('/', asyncHandler(createWaterChangeLog))
