import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireSeedSupplierManager } from '../../../middlewares/auth.middleware.js'
import { createSeedSupplier } from '../../../controllers/seed/seed-supplier/index.js'

export function registerCreateSeedSupplier(router) {
  router.post('/', requireSeedSupplierManager, asyncHandler(createSeedSupplier))
}
