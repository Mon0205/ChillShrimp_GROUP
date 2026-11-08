import * as feedingLogService from '../../../services/care/feeding-log.service.js'
import { sendData } from '../../../utils/http.js'

export async function listFeedingLogs(req, res) {
  const result = await feedingLogService.listFeedingLogs({
    farmId: req.params.farmId,
    membership: req.membership,
    filters: req.query,
  })
  return sendData(res, result)
}
