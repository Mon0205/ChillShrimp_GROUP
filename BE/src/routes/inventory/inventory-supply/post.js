import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireInventorySupplyManager } from '../../../middlewares/auth.middleware.js'
import { createInventorySupply } from '../../../controllers/inventory/inventory-supply/index.js'

export function registerCreateInventorySupply(router) {
  router.post('/', requireInventorySupplyManager, asyncHandler(createInventorySupply))
}
