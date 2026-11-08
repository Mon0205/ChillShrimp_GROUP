import { asyncHandler } from '../../../middlewares/async-handler.js'
import { createWaterParameterLog } from '../../../controllers/care/water-parameter-log/index.js'

export function registerCreateWaterParameterLog(router) {
  router.post('/', asyncHandler(createWaterParameterLog))
}
