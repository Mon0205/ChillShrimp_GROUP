import { Router } from 'express'
import { requireAuth, requireCareLogAccess } from '../../../middlewares/auth.middleware.js'
import { registerListTreatmentLogs } from './get.js'
import { registerCreateTreatmentLog } from './post.js'

export function createTreatmentLogRouter({ authenticate = requireAuth } = {}) {
  const router = Router({ mergeParams: true })
  router.use(authenticate, requireCareLogAccess)
  registerListTreatmentLogs(router)
  registerCreateTreatmentLog(router)
  return router
}

export const treatmentLogRouter = createTreatmentLogRouter()
