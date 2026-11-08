import * as pondTankService from '../../../services/farms/pond-tank.service.js'
import { sendData } from '../../../utils/http.js'

export async function createPondTank(req, res) {
  const result = await pondTankService.createPondTank({
    membership: req.membership,
    farmId: req.params?.farmId,
    filters: req.query,
    tankId: req.params?.tankId,
    input: req.body,
  })
  return sendData(res, result, 201)
}
