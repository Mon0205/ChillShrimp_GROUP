import { asyncHandler } from '../../../middlewares/async-handler.js'
import { getFeedingReport } from '../../../controllers/care/feeding-report/index.js'

export function registerGetFeedingReport(router) {
  router.get('/feeding', asyncHandler(getFeedingReport))
}
