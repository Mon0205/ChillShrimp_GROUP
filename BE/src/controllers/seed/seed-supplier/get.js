import * as seedSupplierService from '../../../services/seed/seed-supplier.service.js'
import { sendData } from '../../../utils/http.js'

export async function listSeedSuppliers(req, res) {
  const result = await seedSupplierService.listSeedSuppliers({
    filters: req.query,
    farmId: req.params?.farmId,
    supplierId: req.params?.supplierId,
    input: req.body,
    membership: req.membership,
  })
  return sendData(res, result)
}

export async function getSeedSupplier(req, res) {
  const result = await seedSupplierService.getSeedSupplier({
    filters: req.query,
    farmId: req.params?.farmId,
    supplierId: req.params?.supplierId,
    input: req.body,
    membership: req.membership,
  })
  return sendData(res, result)
}

export async function listSupplierSeedBatches(req, res) {
  const result = await seedSupplierService.listSupplierSeedBatches({
    filters: req.query,
    farmId: req.params?.farmId,
    supplierId: req.params?.supplierId,
    input: req.body,
    membership: req.membership,
  })
  return sendData(res, result)
}
