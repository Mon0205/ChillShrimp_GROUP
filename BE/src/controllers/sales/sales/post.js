import * as service from '../../../services/sales/sales.service.js'
import { sendData } from '../../../utils/http.js'

export async function createCustomer(req, res) {
  const result = await service.createCustomer({ farmId: req.params.farmId, input: req.body, membership: req.membership })
  return sendData(res, result, 201)
}

export async function createSalesOrder(req, res) {
  const result = await service.createSalesOrder({ farmId: req.params.farmId, actor: req.auth, input: req.body, membership: req.membership })
  return sendData(res, result, 201)
}

export async function confirmSalesOrder(req, res) {
  const result = await service.confirmSalesOrder({ actor: req.auth, input: req.body, membership: req.membership, orderId: req.params.orderId, farmId: req.params.farmId })
  return sendData(res, result)
}

export async function cancelSalesOrder(req, res) {
  const result = await service.cancelSalesOrder({ actor: req.auth, input: req.body, membership: req.membership, orderId: req.params.orderId, farmId: req.params.farmId })
  return sendData(res, result)
}

export async function createSalesDelivery(req, res) {
  const result = await service.createSalesDelivery({ actor: req.auth, input: req.body, membership: req.membership, orderId: req.params.orderId, farmId: req.params.farmId })
  return sendData(res, result)
}

export async function createSalesPayment(req, res) {
  const result = await service.createSalesPayment({ actor: req.auth, input: req.body, membership: req.membership, orderId: req.params.orderId, farmId: req.params.farmId })
  return sendData(res, result)
}
