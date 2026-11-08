import * as service from '../../../services/inventory/inventory-supply.service.js'
import { sendData } from '../../../utils/http.js'

export async function updateInventorySupply(req, res) {
  const result = await service.updateInventorySupply({ supplyId: req.params.supplyId, farmId: req.params.farmId, input: req.body })
  return sendData(res, result)
}
