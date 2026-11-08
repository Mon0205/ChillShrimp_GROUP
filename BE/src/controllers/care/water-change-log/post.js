import * as waterChangeLogService from '../../../services/care/water-change-log.service.js'
import { sendData } from '../../../utils/http.js'

export async function createWaterChangeLog(req, res) {
  const result = await waterChangeLogService.createWaterChangeLog({
    farmId: req.params.farmId,
    membership: req.membership,
    actor: req.auth,
    input: req.body,
  })
  return sendData(res, result, 201)
}
