import * as farmService from '../../../services/farms/farm.service.js'
import { sendData } from '../../../utils/http.js'

export async function updateFarm(req, res) {
  const result = await farmService.updateFarm({
    filters: req.query,
    actor: req.auth,
    input: req.body,
    farmId: req.params?.farmId,
  })
  return sendData(res, result)
}

export async function updateFarmStatus(req, res) {
  const result = await farmService.updateFarmStatus({
    filters: req.query,
    actor: req.auth,
    input: req.body,
    farmId: req.params?.farmId,
  })
  return sendData(res, result)
}
