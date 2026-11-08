import { Router } from 'express'
import { requireAuth } from '../../../middlewares/auth.middleware.js'
import { registerListInventorySupplies, registerGetInventorySupply } from './get.js'
import { registerCreateInventorySupply } from './post.js'
import { registerUpdateInventorySupply } from './patch.js'
import { registerDeleteInventorySupply } from './delete.js'

export const inventorySupplyRouter = Router({ mergeParams: true })
inventorySupplyRouter.use(requireAuth)
registerListInventorySupplies(inventorySupplyRouter)
registerGetInventorySupply(inventorySupplyRouter)
registerCreateInventorySupply(inventorySupplyRouter)
registerUpdateInventorySupply(inventorySupplyRouter)
registerDeleteInventorySupply(inventorySupplyRouter)
