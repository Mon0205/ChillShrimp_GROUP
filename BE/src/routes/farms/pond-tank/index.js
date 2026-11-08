import { Router } from 'express'
import { requireAuth } from '../../../middlewares/auth.middleware.js'
import { registerListPondTanks, registerListAvailableTechnicians, registerGetPondTank } from './get.js'
import { registerCreatePondTank } from './post.js'
import { registerUpdatePondTank, registerUpdatePondTankStatus } from './patch.js'

export const pondTankRouter = Router({ mergeParams: true })
pondTankRouter.use(requireAuth)
registerListPondTanks(pondTankRouter)
registerListAvailableTechnicians(pondTankRouter)
registerGetPondTank(pondTankRouter)
registerCreatePondTank(pondTankRouter)
registerUpdatePondTank(pondTankRouter)
registerUpdatePondTankStatus(pondTankRouter)
