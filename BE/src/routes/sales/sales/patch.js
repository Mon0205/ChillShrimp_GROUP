import { asyncHandler } from '../../../middlewares/async-handler.js'
import * as sales from '../../../controllers/sales/sales/index.js'

export function registerUpdateCustomer(router) {
  router.patch('/:customerId', asyncHandler(sales.updateCustomer))
}

export function registerUpdateSalesOrder(router) {
  router.patch('/:orderId', asyncHandler(sales.updateSalesOrder))
}
