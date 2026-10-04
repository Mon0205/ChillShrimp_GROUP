import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireInventorySupplyManager, requireInventoryUsageAccess } from '../middlewares/auth.middleware.js'
import {
  listInventoryImports,
  listInventoryUsageTransactions,
  recordInventoryImport,
  recordInventoryUsage,
} from '../controllers/inventory-transaction.controller.js'

export function createInventoryTransactionRouter({ authenticate = requireAuth } = {}) {
  const router = Router({ mergeParams: true })
  router.use(authenticate)
  router.get('/', requireInventoryUsageAccess, asyncHandler(listInventoryUsageTransactions))
  router.post('/usage', requireInventoryUsageAccess, asyncHandler(recordInventoryUsage))
  router.get('/imports', requireInventorySupplyManager, asyncHandler(listInventoryImports))
  router.post('/imports', requireInventorySupplyManager, asyncHandler(recordInventoryImport))
  return router
}

export const inventoryTransactionRouter = createInventoryTransactionRouter()
