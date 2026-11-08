import * as service from '../../../services/inventory/inventory-transaction.service.js'
import { sendData } from '../../../utils/http.js'

export async function listInventoryUsageTransactions(req, res) {
  const result = await service.listInventoryUsageTransactions({ farmId: req.params.farmId, membership: req.membership, filters: req.query })
  return sendData(res, result)
}

export async function listInventoryImports(req, res) {
  const result = await service.listInventoryImports({ farmId: req.params.farmId, filters: req.query })
  return sendData(res, result)
}

export async function listInventoryAdjustments(req, res) {
  const result = await service.listInventoryAdjustments({ farmId: req.params.farmId, filters: req.query })
  return sendData(res, result)
}
