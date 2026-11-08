import * as feedingReportService from '../../../services/care/feeding-report.service.js'
import { sendData } from '../../../utils/http.js'

export async function getFeedingReport(req, res) {
  const result = await feedingReportService.getFeedingReport({
    farmId: req.params.farmId,
    membership: req.membership,
    filters: req.query,
  })
  return sendData(res, result)
}
