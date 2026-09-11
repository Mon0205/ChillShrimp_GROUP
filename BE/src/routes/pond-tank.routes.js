import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requirePondTankManager, requirePondTankViewer } from '../middlewares/auth.middleware.js'
import {
  createPondTank,
  deletePondTank,
  getPondTank,
  listPondTanks,
  updatePondTank,
  updatePondTankStatus,
} from '../controllers/pond-tank.controller.js'

export const pondTankRouter = Router({ mergeParams: true })
pondTankRouter.use(requireAuth)
pondTankRouter.get('/', requirePondTankViewer, asyncHandler(listPondTanks))
pondTankRouter.get('/:tankId', requirePondTankViewer, asyncHandler(getPondTank))
pondTankRouter.post('/', requirePondTankManager, asyncHandler(createPondTank))
pondTankRouter.patch('/:tankId', requirePondTankManager, asyncHandler(updatePondTank))
pondTankRouter.patch('/:tankId/status', requirePondTankManager, asyncHandler(updatePondTankStatus))
pondTankRouter.delete('/:tankId', requirePondTankManager, asyncHandler(deletePondTank))
