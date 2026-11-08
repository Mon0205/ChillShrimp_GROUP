import * as service from '../../../services/inventory/inventory-request.service.js'
import { sendData } from '../../../utils/http.js'

export async function createInventorySupplyRequest(req, res) {
  const result = await service.createInventorySupplyRequest({ farmId: req.params.farmId, actor: req.auth, membership: req.membership, input: req.body })
  return sendData(res, result, 201)
}

export async function approveInventorySupplyRequest(req, res) {
  const result = await service.approveInventorySupplyRequest({ farmId: req.params.farmId, requestId: req.params.requestId, actor: req.auth, membership: req.membership })
  return sendData(res, result)
}

export async function rejectInventorySupplyRequest(req, res) {
  const result = await service.rejectInventorySupplyRequest({ farmId: req.params.farmId, requestId: req.params.requestId, actor: req.auth, membership: req.membership, input: req.body })
  return sendData(res, result)
}
