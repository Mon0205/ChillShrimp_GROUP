import * as service from '../../../services/inventory/inventory-supply.service.js'
import { sendData } from '../../../utils/http.js'

export async function listInventorySupplies(req, res) {
  const result = await service.listInventorySupplies({ farmId: req.params.farmId, filters: req.query })
  return sendData(res, result)
}

export async function getInventorySupply(req, res) {
  const result = await service.getInventorySupply({ supplyId: req.params.supplyId, farmId: req.params.farmId })
  return sendData(res, result)
}
