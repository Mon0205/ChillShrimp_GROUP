import { asyncHandler } from '../../../middlewares/async-handler.js'
import { listFeedingLogs } from '../../../controllers/care/feeding-log/index.js'

export function registerListFeedingLogs(router) {
  router.get('/', asyncHandler(listFeedingLogs))
}
