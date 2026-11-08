import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireSeedSupplierManager } from '../../../middlewares/auth.middleware.js'
import { updateSeedSupplier } from '../../../controllers/seed/seed-supplier/index.js'

export function registerUpdateSeedSupplier(router) {
  router.patch('/:supplierId', requireSeedSupplierManager, asyncHandler(updateSeedSupplier))
}
