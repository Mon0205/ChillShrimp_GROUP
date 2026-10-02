import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireInventoryUsageAccess } from '../middlewares/auth.middleware.js'
import { listInventoryUsageTransactions, recordInventoryUsage } from '../controllers/inventory-transaction.controller.js'

export const inventoryTransactionRouter = Router({ mergeParams: true })
inventoryTransactionRouter.use(requireAuth, requireInventoryUsageAccess)
inventoryTransactionRouter.get('/', asyncHandler(listInventoryUsageTransactions))
inventoryTransactionRouter.post('/usage', asyncHandler(recordInventoryUsage))
