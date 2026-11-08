import { Router } from 'express'
import { requireAuth, requireFarmManager } from '../../../middlewares/auth.middleware.js'
import { registerListCustomers, registerListSalesOrders, registerListSalesBatches, registerGetSalesOrder } from './get.js'
import { registerCreateCustomer, registerCreateSalesOrder, registerConfirmSalesOrder, registerCancelSalesOrder, registerCreateSalesDelivery, registerCreateSalesPayment } from './post.js'
import { registerUpdateCustomer, registerUpdateSalesOrder } from './patch.js'

export const customerRouter = Router({ mergeParams: true })
customerRouter.use(requireAuth, requireFarmManager)
registerListCustomers(customerRouter)
registerCreateCustomer(customerRouter)
registerUpdateCustomer(customerRouter)

export const salesOrderRouter = Router({ mergeParams: true })
salesOrderRouter.use(requireAuth, requireFarmManager)
registerListSalesOrders(salesOrderRouter)
registerListSalesBatches(salesOrderRouter)
registerGetSalesOrder(salesOrderRouter)
registerCreateSalesOrder(salesOrderRouter)
registerUpdateSalesOrder(salesOrderRouter)
registerConfirmSalesOrder(salesOrderRouter)
registerCancelSalesOrder(salesOrderRouter)
registerCreateSalesDelivery(salesOrderRouter)
registerCreateSalesPayment(salesOrderRouter)
