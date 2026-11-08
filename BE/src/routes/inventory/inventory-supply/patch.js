import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireInventorySupplyManager } from '../../../middlewares/auth.middleware.js'
import { updateInventorySupply } from '../../../controllers/inventory/inventory-supply/index.js'

export function registerUpdateInventorySupply(router) {
  router.patch('/:supplyId', requireInventorySupplyManager, asyncHandler(updateInventorySupply))
}
