import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requirePondTankManager, requirePondTankViewer } from '../../../middlewares/auth.middleware.js'
import { getPondTank, listPondTanks, listAvailableTechnicians } from '../../../controllers/farms/pond-tank/index.js'

export function registerListPondTanks(router) {
  router.get('/', requirePondTankViewer, asyncHandler(listPondTanks))
}

export function registerListAvailableTechnicians(router) {
  router.get('/available-technicians', requirePondTankManager, asyncHandler(listAvailableTechnicians))
}

export function registerGetPondTank(router) {
  router.get('/:tankId', requirePondTankViewer, asyncHandler(getPondTank))
}
