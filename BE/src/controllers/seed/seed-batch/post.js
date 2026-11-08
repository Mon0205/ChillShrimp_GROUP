import * as seedBatchService from '../../../services/seed/seed-batch.service.js'
import { sendData } from '../../../utils/http.js'

export async function createSeedBatch(req, res) {
  const result = await seedBatchService.createSeedBatch({
    membership: req.membership,
    farmId: req.params?.farmId,
    filters: req.query,
    batchId: req.params?.batchId,
    input: req.body,
  })
  return sendData(res, result, 201)
}
