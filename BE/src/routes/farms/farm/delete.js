import { deleteFarm } from '../../../controllers/farms/farm/index.js'
import { requireFarmOwnerIncludingArchived } from '../../../middlewares/auth.middleware.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'

export function registerDeleteFarm(router) {
  router.delete('/:farmId', requireFarmOwnerIncludingArchived, asyncHandler(deleteFarm))
}
