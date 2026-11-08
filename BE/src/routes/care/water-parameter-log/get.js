import { asyncHandler } from '../../../middlewares/async-handler.js'
import { listWaterParameterLogs } from '../../../controllers/care/water-parameter-log/index.js'

export function registerListWaterParameterLogs(router) {
  router.get('/', asyncHandler(listWaterParameterLogs))
}
