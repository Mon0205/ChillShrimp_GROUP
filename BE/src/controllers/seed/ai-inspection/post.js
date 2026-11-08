import * as aiInspectionService from '../../../services/seed/ai-inspection.service.js'
import { sendData } from '../../../utils/http.js'

export async function createAiInspectionUploadSignature(req, res) {
  const result = await aiInspectionService.createAiInspectionUploadSignature({
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

export async function createAiInspection(req, res) {
  const result = await aiInspectionService.createAiInspection({
    membership: req.membership,
    farmId: req.params?.farmId,
    batchId: req.params?.batchId,
    filters: req.query,
    input: req.body,
    actor: req.auth,
    inspectionId: req.params?.inspectionId,
  })
  return sendData(res, result, 201)
}

export async function analyzeAiInspection(req, res) {
  const result = await aiInspectionService.analyzeAiInspection({
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
