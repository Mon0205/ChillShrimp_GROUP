import { deleteArea } from '../../../controllers/farms/area/index.js'
import { requireFarmOwner } from '../../../middlewares/auth.middleware.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'

export function registerDeleteArea(router) {
  router.delete('/:areaId', requireFarmOwner, asyncHandler(deleteArea))
}
