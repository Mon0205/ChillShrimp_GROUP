import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requirePondTankManager } from '../../../middlewares/auth.middleware.js'
import { updatePondTank, updatePondTankStatus } from '../../../controllers/farms/pond-tank/index.js'

export function registerUpdatePondTank(router) {
  router.patch('/:tankId', requirePondTankManager, asyncHandler(updatePondTank))
}

export function registerUpdatePondTankStatus(router) {
  router.patch('/:tankId/status', requirePondTankManager, asyncHandler(updatePondTankStatus))
}
