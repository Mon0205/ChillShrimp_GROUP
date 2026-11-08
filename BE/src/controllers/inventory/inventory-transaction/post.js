import * as service from '../../../services/inventory/inventory-transaction.service.js'
import { sendData } from '../../../utils/http.js'

export async function recordInventoryImport(req, res) {
  const result = await service.recordInventoryImport({ farmId: req.params.farmId, actor: req.auth, input: req.body })
  return sendData(res, result, 201)
}

export async function recordInventoryAdjustment(req, res) {
  const result = await service.recordInventoryAdjustment({ farmId: req.params.farmId, actor: req.auth, input: req.body })
  return sendData(res, result, 201)
}
