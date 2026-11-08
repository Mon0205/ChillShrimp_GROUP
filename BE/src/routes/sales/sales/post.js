import { asyncHandler } from '../../../middlewares/async-handler.js'
import * as sales from '../../../controllers/sales/sales/index.js'

export function registerCreateCustomer(router) {
  router.post('/', asyncHandler(sales.createCustomer))
}

export function registerCreateSalesOrder(router) {
  router.post('/', asyncHandler(sales.createSalesOrder))
}

export function registerConfirmSalesOrder(router) {
  router.post('/:orderId/confirm', asyncHandler(sales.confirmSalesOrder))
}

export function registerCancelSalesOrder(router) {
  router.post('/:orderId/cancel', asyncHandler(sales.cancelSalesOrder))
}

export function registerCreateSalesDelivery(router) {
  router.post('/:orderId/deliveries', asyncHandler(sales.createSalesDelivery))
}

export function registerCreateSalesPayment(router) {
  router.post('/:orderId/payments', asyncHandler(sales.createSalesPayment))
}
