import { Router } from 'express'
import { createArea, listAreas } from '../controllers/area.controller.js'
import { requireAuth, requireFarmManager, requireFarmOwner } from '../middlewares/auth.middleware.js'
import { asyncHandler } from '../middlewares/async-handler.js'

export const areaRouter = Router({ mergeParams: true })
areaRouter.use(requireAuth)
areaRouter.get('/', requireFarmManager, asyncHandler(listAreas))
areaRouter.post('/', requireFarmOwner, asyncHandler(createArea))
