import * as service from '../../../services/inventory/inventory-request.service.js'
import { sendData } from '../../../utils/http.js'

export async function listInventorySupplyRequests(req, res) {
  const result = await service.listInventorySupplyRequests({ farmId: req.params.farmId, membership: req.membership, filters: req.query })
  return sendData(res, result)
}
