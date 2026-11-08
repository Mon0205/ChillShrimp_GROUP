import * as areaService from '../../../services/farms/area.service.js'
import { sendData } from '../../../utils/http.js'

export async function updateArea(req, res) {
  const result = await areaService.updateArea({
    filters: req.query,
    membership: req.membership,
    farmId: req.params?.farmId,
    input: req.body,
    areaId: req.params?.areaId,
  })
  return sendData(res, result)
}

export async function updateAreaStatus(req, res) {
  const result = await areaService.updateAreaStatus({
    filters: req.query,
    membership: req.membership,
    farmId: req.params?.farmId,
    input: req.body,
    areaId: req.params?.areaId,
  })
  return sendData(res, result)
}
