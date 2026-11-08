import * as waterParameterLogService from '../../../services/care/water-parameter-log.service.js'
import { sendData } from '../../../utils/http.js'

export async function listWaterParameterLogs(req, res) {
  const result = await waterParameterLogService.listWaterParameterLogs({
    farmId: req.params.farmId,
    membership: req.membership,
    filters: req.query,
  })
  return sendData(res, result)
}
