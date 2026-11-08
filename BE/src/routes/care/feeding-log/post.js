import { asyncHandler } from '../../../middlewares/async-handler.js'
import { createFeedingLog } from '../../../controllers/care/feeding-log/index.js'

export function registerCreateFeedingLog(router) {
  router.post('/', asyncHandler(createFeedingLog))
}
