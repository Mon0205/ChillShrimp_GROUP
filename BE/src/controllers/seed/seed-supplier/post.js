import * as seedSupplierService from '../../../services/seed/seed-supplier.service.js'
import { sendData } from '../../../utils/http.js'

export async function createSeedSupplier(req, res) {
  const result = await seedSupplierService.createSeedSupplier({
    filters: req.query,
    farmId: req.params?.farmId,
    supplierId: req.params?.supplierId,
    input: req.body,
    membership: req.membership,
  })
  return sendData(res, result, 201)
}
