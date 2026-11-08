import * as service from '../../../services/sales/sales.service.js'
import { sendData } from '../../../utils/http.js'

export async function listCustomers(req, res) {
  const result = await service.listCustomers({ farmId: req.params.farmId, membership: req.membership, filters: req.query })
  return sendData(res, result)
}

export async function listSalesBatches(req, res) {
  const result = await service.listSalesBatches({ membership: req.membership, farmId: req.params.farmId, filters: req.query })
  return sendData(res, result)
}

export async function listSalesOrders(req, res) {
  const result = await service.listSalesOrders({ filters: req.query, membership: req.membership, farmId: req.params.farmId })
  return sendData(res, result)
}

export async function getSalesOrder(req, res) {
  const result = await service.getSalesOrder({ membership: req.membership, orderId: req.params.orderId, farmId: req.params.farmId })
  return sendData(res, result)
}
