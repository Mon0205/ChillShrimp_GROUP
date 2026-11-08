import * as areaService from '../../../services/farms/area.service.js'
import { sendData } from '../../../utils/http.js'

export async function listAreas(req, res) {
  const result = await areaService.listAreas({
    filters: req.query,
    membership: req.membership,
    farmId: req.params?.farmId,
    input: req.body,
    areaId: req.params?.areaId,
  })
  return sendData(res, result)
}
