import { Router } from 'express'
import { createFarm, deleteFarm, listFarms, updateFarm } from '../controllers/farm.controller.js'
import { requireAuth, requireFarmOwner, requireOwnerAccount } from '../middlewares/auth.middleware.js'
import { asyncHandler } from '../middlewares/async-handler.js'

export const farmRouter = Router()
farmRouter.use(requireAuth)
farmRouter.get('/', asyncHandler(listFarms))
farmRouter.post('/', requireOwnerAccount, asyncHandler(createFarm))
farmRouter.patch('/:farmId', requireFarmOwner, asyncHandler(updateFarm))
farmRouter.delete('/:farmId', asyncHandler(deleteFarm))
