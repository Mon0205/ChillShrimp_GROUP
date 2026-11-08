import * as waterParameterLogService from '../../../services/care/water-parameter-log.service.js'
import { sendData } from '../../../utils/http.js'

export async function createWaterParameterLog(req, res) {
  const result = await waterParameterLogService.createWaterParameterLog({
    farmId: req.params.farmId,
    membership: req.membership,
    actor: req.auth,
    input: req.body,
  })
  return sendData(res, result, 201)
}
