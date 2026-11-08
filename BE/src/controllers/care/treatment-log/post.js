import * as treatmentLogService from '../../../services/care/treatment-log.service.js'
import { sendData } from '../../../utils/http.js'

export async function createTreatmentLog(req, res) {
  const result = await treatmentLogService.createTreatmentLog({
    farmId: req.params.farmId,
    membership: req.membership,
    actor: req.auth,
    input: req.body,
  })
  return sendData(res, result, 201)
}
