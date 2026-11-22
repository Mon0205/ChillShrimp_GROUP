import * as dashboardSummaryService from '../../../services/dashboard/summary.service.js'
import { sendData } from '../../../utils/http.js'

export async function getDashboardSummary(req, res) {
  const result = await dashboardSummaryService.getDashboardSummary({
    farmId: req.params.farmId,
    membership: req.membership,
    actor: req.auth,
  })
  return sendData(res, result)
}
