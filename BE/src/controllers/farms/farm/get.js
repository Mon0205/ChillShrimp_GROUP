import * as farmService from '../../../services/farms/farm.service.js'
import { sendData } from '../../../utils/http.js'

export async function listFarms(req, res) {
  const result = await farmService.listFarms({
    filters: req.query,
    actor: req.auth,
    input: req.body,
    farmId: req.params?.farmId,
  })
  return sendData(res, result)
}
