import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireInventorySupplyManager, requireInventorySupplyViewer } from '../middlewares/auth.middleware.js'
import { createInventorySupply, deleteInventorySupply, getInventorySupply, listInventorySupplies, updateInventorySupply } from '../controllers/inventory-supply.controller.js'

export const inventorySupplyRouter = Router({ mergeParams: true })
inventorySupplyRouter.use(requireAuth)
inventorySupplyRouter.get('/', requireInventorySupplyViewer, asyncHandler(listInventorySupplies))
inventorySupplyRouter.get('/:supplyId', requireInventorySupplyViewer, asyncHandler(getInventorySupply))
inventorySupplyRouter.post('/', requireInventorySupplyManager, asyncHandler(createInventorySupply))
inventorySupplyRouter.patch('/:supplyId', requireInventorySupplyManager, asyncHandler(updateInventorySupply))
inventorySupplyRouter.delete('/:supplyId', requireInventorySupplyManager, asyncHandler(deleteInventorySupply))
