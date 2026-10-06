import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import {
  requireAuth,
  requireInventoryAdjustmentManager,
  requireInventoryRequestAccess,
  requireInventoryRequestCreator,
  requireInventorySupplyManager,
  requireInventoryUsageAccess,
} from '../middlewares/auth.middleware.js'
import {
  listInventoryAdjustments,
  listInventoryImports,
  listInventoryUsageTransactions,
  recordInventoryAdjustment,
  recordInventoryImport,
  recordInventoryUsage,
} from '../controllers/inventory-transaction.controller.js'
import { createInventorySupplyRequest, listInventorySupplyRequests } from '../controllers/inventory-request.controller.js'

export function createInventoryTransactionRouter({ authenticate = requireAuth } = {}) {
  const router = Router({ mergeParams: true })
  router.use(authenticate)
  router.get('/', requireInventoryUsageAccess, asyncHandler(listInventoryUsageTransactions))
  router.post('/usage', requireInventoryUsageAccess, asyncHandler(recordInventoryUsage))
  router.get('/imports', requireInventorySupplyManager, asyncHandler(listInventoryImports))
  router.post('/imports', requireInventorySupplyManager, asyncHandler(recordInventoryImport))
  router.get('/adjustments', requireInventoryAdjustmentManager, asyncHandler(listInventoryAdjustments))
  router.post('/adjustments', requireInventoryAdjustmentManager, asyncHandler(recordInventoryAdjustment))
  router.get('/requests', requireInventoryRequestAccess, asyncHandler(listInventorySupplyRequests))
  router.post('/requests', requireInventoryRequestCreator, asyncHandler(createInventorySupplyRequest))
  return router
}

export const inventoryTransactionRouter = createInventoryTransactionRouter()
