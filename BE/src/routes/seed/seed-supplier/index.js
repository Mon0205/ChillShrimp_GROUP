import { Router } from 'express'
import { requireAuth } from '../../../middlewares/auth.middleware.js'
import { registerListSeedSuppliers, registerListSupplierSeedBatches, registerGetSeedSupplier } from './get.js'
import { registerCreateSeedSupplier } from './post.js'
import { registerUpdateSeedSupplier } from './patch.js'

export const seedSupplierRouter = Router({ mergeParams: true })
seedSupplierRouter.use(requireAuth)
registerListSeedSuppliers(seedSupplierRouter)
registerCreateSeedSupplier(seedSupplierRouter)
registerListSupplierSeedBatches(seedSupplierRouter)
registerGetSeedSupplier(seedSupplierRouter)
registerUpdateSeedSupplier(seedSupplierRouter)
