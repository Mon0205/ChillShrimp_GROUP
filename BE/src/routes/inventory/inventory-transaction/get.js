import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireInventoryAdjustmentManager, requireInventoryRequestAccess, requireInventorySupplyManager, requireInventoryUsageAccess } from '../../../middlewares/auth.middleware.js'
import { listInventoryAdjustments, listInventoryImports, listInventoryUsageTransactions } from '../../../controllers/inventory/inventory-transaction/index.js'
import { listInventorySupplyRequests } from '../../../controllers/inventory/inventory-request/index.js'

export function registerListInventoryUsageTransactions(router) {
  router.get('/', requireInventoryUsageAccess, asyncHandler(listInventoryUsageTransactions))
}

export function registerListInventoryImports(router) {
  router.get('/imports', requireInventorySupplyManager, asyncHandler(listInventoryImports))
}

export function registerListInventoryAdjustments(router) {
  router.get('/adjustments', requireInventoryAdjustmentManager, asyncHandler(listInventoryAdjustments))
}

export function registerListInventorySupplyRequests(router) {
  router.get('/requests', requireInventoryRequestAccess, asyncHandler(listInventorySupplyRequests))
}
