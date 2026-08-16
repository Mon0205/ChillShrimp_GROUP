import { Router } from 'express'
import { createFarm, deleteFarm, listFarms, updateFarm } from '../controllers/farm.controller.js'
import { requireAuth, requireFarmManager } from '../middlewares/auth.middleware.js'
import { asyncHandler } from '../middlewares/async-handler.js'

export const farmRouter = Router()
farmRouter.use(requireAuth)
farmRouter.get('/', asyncHandler(listFarms))
farmRouter.post('/', asyncHandler(createFarm))
farmRouter.patch('/:farmId', requireFarmManager, asyncHandler(updateFarm))
farmRouter.delete('/:farmId', asyncHandler(deleteFarm))
