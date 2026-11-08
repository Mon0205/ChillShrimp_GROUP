import * as areaService from '../../../services/farms/area.service.js'

export async function deleteArea(req, res) {
  const result = await areaService.deleteArea({
    filters: req.query,
    membership: req.membership,
    farmId: req.params?.farmId,
    input: req.body,
    areaId: req.params?.areaId,
  })
  return res.status(204).end()
}
