import { Router } from 'express'
import { requireAuth } from '../../../middlewares/auth.middleware.js'
import { registerListInventoryUsageTransactions, registerListInventoryImports, registerListInventoryAdjustments, registerListInventorySupplyRequests } from './get.js'
import { registerRecordInventoryImport, registerRecordInventoryAdjustment, registerApproveInventorySupplyRequest, registerRejectInventorySupplyRequest, registerCreateInventorySupplyRequest } from './post.js'

export function createInventoryTransactionRouter({ authenticate = requireAuth } = {}) {
  const router = Router({ mergeParams: true })
  router.use(authenticate)
  registerListInventoryUsageTransactions(router)
  registerListInventoryImports(router)
  registerRecordInventoryImport(router)
  registerListInventoryAdjustments(router)
  registerRecordInventoryAdjustment(router)
  registerListInventorySupplyRequests(router)
  registerApproveInventorySupplyRequest(router)
  registerRejectInventorySupplyRequest(router)
  registerCreateInventorySupplyRequest(router)
  return router
}

export const inventoryTransactionRouter = createInventoryTransactionRouter()
