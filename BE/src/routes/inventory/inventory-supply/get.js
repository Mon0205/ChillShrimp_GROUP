import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireInventorySupplyViewer } from '../../../middlewares/auth.middleware.js'
import { getInventorySupply, listInventorySupplies } from '../../../controllers/inventory/inventory-supply/index.js'

export function registerListInventorySupplies(router) {
  router.get('/', requireInventorySupplyViewer, asyncHandler(listInventorySupplies))
}

export function registerGetInventorySupply(router) {
  router.get('/:supplyId', requireInventorySupplyViewer, asyncHandler(getInventorySupply))
}
