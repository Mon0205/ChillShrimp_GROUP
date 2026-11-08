import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireSeedSupplierViewer } from '../../../middlewares/auth.middleware.js'
import { getSeedSupplier, listSeedSuppliers, listSupplierSeedBatches } from '../../../controllers/seed/seed-supplier/index.js'

export function registerListSeedSuppliers(router) {
  router.get('/', requireSeedSupplierViewer, asyncHandler(listSeedSuppliers))
}

export function registerListSupplierSeedBatches(router) {
  router.get('/:supplierId/seed-batches', requireSeedSupplierViewer, asyncHandler(listSupplierSeedBatches))
}

export function registerGetSeedSupplier(router) {
  router.get('/:supplierId', requireSeedSupplierViewer, asyncHandler(getSeedSupplier))
}
