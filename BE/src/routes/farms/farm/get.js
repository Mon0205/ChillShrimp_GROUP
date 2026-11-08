import { listFarms } from '../../../controllers/farms/farm/index.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'

export function registerListFarms(router) {
  router.get('/', asyncHandler(listFarms))
}
