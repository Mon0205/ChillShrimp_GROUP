import { createArea } from '../../../controllers/farms/area/index.js'
import { requireFarmOwner } from '../../../middlewares/auth.middleware.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'

export function registerCreateArea(router) {
  router.post('/', requireFarmOwner, asyncHandler(createArea))
}
