import * as aiInspectionService from '../../../services/seed/ai-inspection.service.js'
import { sendData } from '../../../utils/http.js'

export async function updateAiInspection(req, res) {
  const result = await aiInspectionService.updateAiInspection({
    membership: req.membership,
    farmId: req.params?.farmId,
    batchId: req.params?.batchId,
    filters: req.query,
    input: req.body,
    actor: req.auth,
    inspectionId: req.params?.inspectionId,
  })
  return sendData(res, result)
}
