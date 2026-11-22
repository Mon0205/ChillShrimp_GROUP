import * as qualityHistoryService from '../../../services/seed/quality-history.service.js'
import { sendData } from '../../../utils/http.js'

export async function listQualityHistory(req, res) {
  const result = await qualityHistoryService.listQualityHistory({
    filters: req.query,
    membership: req.membership,
    actor: req.auth,
    farmId: req.params?.farmId,
  })
  return sendData(res, result)
}
