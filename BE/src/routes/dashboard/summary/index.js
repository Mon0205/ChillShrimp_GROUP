import { Router } from 'express'
import { requireAuth, requireFarmMember } from '../../../middlewares/auth.middleware.js'
import { registerGetDashboardSummary } from './get.js'

// Every member may open the dashboard; the service picks the cards and their scope from the member's role.
export const dashboardRouter = Router({ mergeParams: true })
dashboardRouter.use(requireAuth, requireFarmMember)
registerGetDashboardSummary(dashboardRouter)
