import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireCareLogAccess } from '../middlewares/auth.middleware.js'
import { createTreatmentLog, listTreatmentLogs } from '../controllers/treatment-log.controller.js'

export const treatmentLogRouter = Router({ mergeParams: true })
treatmentLogRouter.use(requireAuth, requireCareLogAccess)
treatmentLogRouter.get('/', asyncHandler(listTreatmentLogs))
treatmentLogRouter.post('/', asyncHandler(createTreatmentLog))
