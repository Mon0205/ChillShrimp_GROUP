import * as waterChangeLogService from '../../../services/care/water-change-log.service.js'
import { sendData } from '../../../utils/http.js'

export async function listWaterChangeLogs(req, res) {
  const result = await waterChangeLogService.listWaterChangeLogs({
    farmId: req.params.farmId,
    membership: req.membership,
    filters: req.query,
  })
  return sendData(res, result)
}
