import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireInventoryAdjustmentManager, requireInventoryRequestCreator, requireInventorySupplyManager } from '../../../middlewares/auth.middleware.js'
import { recordInventoryAdjustment, recordInventoryImport } from '../../../controllers/inventory/inventory-transaction/index.js'
import { approveInventorySupplyRequest, createInventorySupplyRequest, rejectInventorySupplyRequest } from '../../../controllers/inventory/inventory-request/index.js'

export function registerRecordInventoryImport(router) {
  router.post('/imports', requireInventorySupplyManager, asyncHandler(recordInventoryImport))
}

export function registerRecordInventoryAdjustment(router) {
  router.post('/adjustments', requireInventoryAdjustmentManager, asyncHandler(recordInventoryAdjustment))
}

export function registerApproveInventorySupplyRequest(router) {
  router.post('/requests/:requestId/approve', requireInventorySupplyManager, asyncHandler(approveInventorySupplyRequest))
}

export function registerRejectInventorySupplyRequest(router) {
  router.post('/requests/:requestId/reject', requireInventorySupplyManager, asyncHandler(rejectInventorySupplyRequest))
}

export function registerCreateInventorySupplyRequest(router) {
  router.post('/requests', requireInventoryRequestCreator, asyncHandler(createInventorySupplyRequest))
}
