import { createFarm } from '../../../controllers/farms/farm/index.js'
import { requireOwnerAccount } from '../../../middlewares/auth.middleware.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'

export function registerCreateFarm(router) {
  router.post('/', requireOwnerAccount, asyncHandler(createFarm))
}
