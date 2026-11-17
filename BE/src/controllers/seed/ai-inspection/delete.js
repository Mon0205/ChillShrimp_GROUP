import * as aiInspectionService from '../../../services/seed/ai-inspection.service.js'
import { sendData } from '../../../utils/http.js'

export async function deleteAiInspection(req, res) {
  const result = await aiInspectionService.deleteAiInspection({
    membership: req.membership,
    farmId: req.params?.farmId,
    batchId: req.params?.batchId,
    actor: req.auth,
    inspectionId: req.params?.inspectionId,
  })
  return sendData(res, result)
}
