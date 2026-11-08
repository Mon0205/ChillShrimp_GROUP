import { listAreas } from '../../../controllers/farms/area/index.js'
import { requireFarmManager } from '../../../middlewares/auth.middleware.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'

export function registerListAreas(router) {
  router.get('/', requireFarmManager, asyncHandler(listAreas))
}
