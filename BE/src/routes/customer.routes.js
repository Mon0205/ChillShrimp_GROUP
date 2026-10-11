import { Router } from 'express'
import { requireAuth, requireFarmOwner } from '../middlewares/auth.middleware.js'
import { asyncHandler } from '../middlewares/async-handler.js'
import { createCustomer, deleteCustomer, getCustomer, listCustomers, updateCustomer } from '../controllers/customer.controller.js'

export function createCustomerRouter({ authenticate = requireAuth } = {}) {
  const router = Router({ mergeParams: true })
  router.use(authenticate, requireFarmOwner)
  router.get('/', asyncHandler(listCustomers))
  router.post('/', asyncHandler(createCustomer))
  router.get('/:customerId', asyncHandler(getCustomer))
  router.patch('/:customerId', asyncHandler(updateCustomer))
  router.delete('/:customerId', asyncHandler(deleteCustomer))
  return router
}
export const customerRouter = createCustomerRouter()
