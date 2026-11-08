import * as seedBatchService from '../../../services/seed/seed-batch.service.js'
import { sendData } from '../../../utils/http.js'

export async function updateSeedBatch(req, res) {
  const result = await seedBatchService.updateSeedBatch({
    membership: req.membership,
    farmId: req.params?.farmId,
    filters: req.query,
    batchId: req.params?.batchId,
    input: req.body,
  })
  return sendData(res, result)
}

export async function updateSeedBatchStatus(req, res) {
  const result = await seedBatchService.updateSeedBatchStatus({
    membership: req.membership,
    farmId: req.params?.farmId,
    filters: req.query,
    batchId: req.params?.batchId,
    input: req.body,
  })
  return sendData(res, result)
}
