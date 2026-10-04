import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireCareLogAccess } from '../middlewares/auth.middleware.js'
import { createTreatmentLog, listTreatmentLogs } from '../controllers/treatment-log.controller.js'

export function createTreatmentLogRouter({ authenticate = requireAuth } = {}) {
  const router = Router({ mergeParams: true })
  router.use(authenticate, requireCareLogAccess)
  router.get('/', asyncHandler(listTreatmentLogs))
  router.post('/', asyncHandler(createTreatmentLog))
  return router
}

export const treatmentLogRouter = createTreatmentLogRouter()
