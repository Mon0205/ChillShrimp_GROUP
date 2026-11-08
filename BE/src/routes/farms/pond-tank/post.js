import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requirePondTankManager } from '../../../middlewares/auth.middleware.js'
import { createPondTank } from '../../../controllers/farms/pond-tank/index.js'

export function registerCreatePondTank(router) {
  router.post('/', requirePondTankManager, asyncHandler(createPondTank))
}
