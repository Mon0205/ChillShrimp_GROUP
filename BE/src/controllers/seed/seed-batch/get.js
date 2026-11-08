import * as seedBatchService from '../../../services/seed/seed-batch.service.js'
import { sendData } from '../../../utils/http.js'

export async function listSeedBatches(req, res) {
  const result = await seedBatchService.listSeedBatches({
    membership: req.membership,
    farmId: req.params?.farmId,
    filters: req.query,
    batchId: req.params?.batchId,
    input: req.body,
  })
  return sendData(res, result)
}

export async function getSeedBatch(req, res) {
  const result = await seedBatchService.getSeedBatch({
    membership: req.membership,
    farmId: req.params?.farmId,
    filters: req.query,
    batchId: req.params?.batchId,
    input: req.body,
  })
  return sendData(res, result)
}
