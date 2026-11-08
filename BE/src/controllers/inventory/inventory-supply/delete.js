import * as service from '../../../services/inventory/inventory-supply.service.js'
import { sendData } from '../../../utils/http.js'

export async function deleteInventorySupply(req, res) {
  const result = await service.deleteInventorySupply({ supplyId: req.params.supplyId, farmId: req.params.farmId })
  return sendData(res, result)
}
