import { asyncHandler } from '../../../middlewares/async-handler.js'
import { getDashboardSummary } from '../../../controllers/dashboard/summary/index.js'

export function registerGetDashboardSummary(router) {
  router.get('/summary', asyncHandler(getDashboardSummary))
}
