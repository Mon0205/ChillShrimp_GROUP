import { updateArea, updateAreaStatus } from '../../../controllers/farms/area/index.js'
import { requireFarmOwner } from '../../../middlewares/auth.middleware.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'

export function registerUpdateAreaStatus(router) {
  router.patch('/:areaId/status', requireFarmOwner, asyncHandler(updateAreaStatus))
}

export function registerUpdateArea(router) {
  router.patch('/:areaId', requireFarmOwner, asyncHandler(updateArea))
}
