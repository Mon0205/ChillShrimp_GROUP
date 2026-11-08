import * as service from '../../../services/sales/sales.service.js'
import { sendData } from '../../../utils/http.js'

export async function updateCustomer(req, res) {
  const result = await service.updateCustomer({ customerId: req.params.customerId, farmId: req.params.farmId, input: req.body, membership: req.membership })
  return sendData(res, result)
}

export async function updateSalesOrder(req, res) {
  const result = await service.updateSalesOrder({ input: req.body, membership: req.membership, orderId: req.params.orderId, farmId: req.params.farmId })
  return sendData(res, result)
}
