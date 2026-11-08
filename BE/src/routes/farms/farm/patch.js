import { updateFarm, updateFarmStatus } from '../../../controllers/farms/farm/index.js'
import { requireFarmOwnerIncludingArchived } from '../../../middlewares/auth.middleware.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'

export function registerUpdateFarmStatus(router) {
  router.patch('/:farmId/status', requireFarmOwnerIncludingArchived, asyncHandler(updateFarmStatus))
}

export function registerUpdateFarm(router) {
  router.patch('/:farmId', requireFarmOwnerIncludingArchived, asyncHandler(updateFarm))
}
