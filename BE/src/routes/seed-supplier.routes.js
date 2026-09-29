import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireSeedSupplierManager, requireSeedSupplierViewer } from '../middlewares/auth.middleware.js'
import {
  createSeedSupplier,
  getSeedSupplier,
  listSeedSuppliers,
  listSupplierSeedBatches,
  updateSeedSupplier,
} from '../controllers/seed-supplier.controller.js'

export const seedSupplierRouter = Router({ mergeParams: true })
seedSupplierRouter.use(requireAuth)
seedSupplierRouter.get('/', requireSeedSupplierViewer, asyncHandler(listSeedSuppliers))
seedSupplierRouter.post('/', requireSeedSupplierManager, asyncHandler(createSeedSupplier))
seedSupplierRouter.get('/:supplierId/seed-batches', requireSeedSupplierViewer, asyncHandler(listSupplierSeedBatches))
seedSupplierRouter.get('/:supplierId', requireSeedSupplierViewer, asyncHandler(getSeedSupplier))
seedSupplierRouter.patch('/:supplierId', requireSeedSupplierManager, asyncHandler(updateSeedSupplier))
