import { Router } from 'express'
import { createFarm, deleteFarm, listFarms, updateFarm, updateFarmStatus } from '../controllers/farm.controller.js'
import { requireAuth, requireFarmOwner, requireFarmOwnerIncludingArchived, requireOwnerAccount } from '../middlewares/auth.middleware.js'
import { asyncHandler } from '../middlewares/async-handler.js'

export const farmRouter = Router()
farmRouter.use(requireAuth)
farmRouter.get('/', asyncHandler(listFarms))
farmRouter.post('/', requireOwnerAccount, asyncHandler(createFarm))
farmRouter.patch('/:farmId/status', requireFarmOwnerIncludingArchived, asyncHandler(updateFarmStatus))
farmRouter.patch('/:farmId', requireFarmOwner, asyncHandler(updateFarm))
farmRouter.delete('/:farmId', requireFarmOwnerIncludingArchived, asyncHandler(deleteFarm))
