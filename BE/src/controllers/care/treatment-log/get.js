import * as treatmentLogService from '../../../services/care/treatment-log.service.js'
import { sendData } from '../../../utils/http.js'

export async function listTreatmentLogs(req, res) {
  const result = await treatmentLogService.listTreatmentLogs({
    farmId: req.params.farmId,
    membership: req.membership,
    filters: req.query,
  })
  return sendData(res, result)
}
