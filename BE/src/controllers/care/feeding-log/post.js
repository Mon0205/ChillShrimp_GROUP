import * as feedingLogService from '../../../services/care/feeding-log.service.js'
import { sendData } from '../../../utils/http.js'

export async function createFeedingLog(req, res) {
  const result = await feedingLogService.createFeedingLog({
    farmId: req.params.farmId,
    membership: req.membership,
    actor: req.auth,
    input: req.body,
  })
  return sendData(res, result, 201)
}
