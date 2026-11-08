import { asyncHandler } from '../../../middlewares/async-handler.js'
import { listWaterChangeLogs } from '../../../controllers/care/water-change-log/index.js'

export function registerListWaterChangeLogs(router) {
  router.get('/', asyncHandler(listWaterChangeLogs))
}
