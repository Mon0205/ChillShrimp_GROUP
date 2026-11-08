import { asyncHandler } from '../../../middlewares/async-handler.js'
import * as sales from '../../../controllers/sales/sales/index.js'

export function registerListCustomers(router) {
  router.get('/', asyncHandler(sales.listCustomers))
}

export function registerListSalesOrders(router) {
  router.get('/', asyncHandler(sales.listSalesOrders))
}

export function registerListSalesBatches(router) {
  router.get('/batches', asyncHandler(sales.listSalesBatches))
}

export function registerGetSalesOrder(router) {
  router.get('/:orderId', asyncHandler(sales.getSalesOrder))
}
