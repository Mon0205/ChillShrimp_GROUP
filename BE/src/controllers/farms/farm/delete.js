import * as farmService from '../../../services/farms/farm.service.js'

export async function deleteFarm(req, res) {
  const result = await farmService.deleteFarm({
    filters: req.query,
    actor: req.auth,
    input: req.body,
    farmId: req.params?.farmId,
  })
  return res.status(204).end()
}
