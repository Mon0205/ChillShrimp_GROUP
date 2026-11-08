import { Router } from 'express'
import { requireAuth } from '../../../middlewares/auth.middleware.js'
import { registerListAreas } from './get.js'
import { registerCreateArea } from './post.js'
import { registerUpdateAreaStatus, registerUpdateArea } from './patch.js'
import { registerDeleteArea } from './delete.js'

export const areaRouter = Router({ mergeParams: true })
areaRouter.use(requireAuth)
registerListAreas(areaRouter)
registerCreateArea(areaRouter)
registerUpdateAreaStatus(areaRouter)
registerUpdateArea(areaRouter)
registerDeleteArea(areaRouter)
