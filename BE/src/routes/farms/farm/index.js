import { Router } from 'express'
import { requireAuth } from '../../../middlewares/auth.middleware.js'
import { registerListFarms } from './get.js'
import { registerCreateFarm } from './post.js'
import { registerUpdateFarmStatus, registerUpdateFarm } from './patch.js'
import { registerDeleteFarm } from './delete.js'

export const farmRouter = Router()
farmRouter.use(requireAuth)
registerListFarms(farmRouter)
registerCreateFarm(farmRouter)
registerUpdateFarmStatus(farmRouter)
registerUpdateFarm(farmRouter)
registerDeleteFarm(farmRouter)
