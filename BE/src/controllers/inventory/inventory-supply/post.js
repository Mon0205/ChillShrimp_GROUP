import * as service from '../../../services/inventory/inventory-supply.service.js'
import { sendData } from '../../../utils/http.js'

export async function createInventorySupply(req, res) {
  const result = await service.createInventorySupply({ farmId: req.params.farmId, input: req.body })
  return sendData(res, result, 201)
}
