import { asyncHandler } from '../../../middlewares/async-handler.js'
import { createWaterChangeLog } from '../../../controllers/care/water-change-log/index.js'

export function registerCreateWaterChangeLog(router) {
  router.post('/', asyncHandler(createWaterChangeLog))
}
