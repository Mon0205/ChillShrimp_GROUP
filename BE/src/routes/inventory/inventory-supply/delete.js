import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireInventorySupplyManager } from '../../../middlewares/auth.middleware.js'
import { deleteInventorySupply } from '../../../controllers/inventory/inventory-supply/index.js'

export function registerDeleteInventorySupply(router) {
  router.delete('/:supplyId', requireInventorySupplyManager, asyncHandler(deleteInventorySupply))
}
