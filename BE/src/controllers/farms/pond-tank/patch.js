import * as pondTankService from '../../../services/farms/pond-tank.service.js'
import { sendData } from '../../../utils/http.js'

export async function updatePondTank(req, res) {
  const result = await pondTankService.updatePondTank({
    membership: req.membership,
    farmId: req.params?.farmId,
    filters: req.query,
    tankId: req.params?.tankId,
    input: req.body,
  })
  return sendData(res, result)
}

export async function updatePondTankStatus(req, res) {
  const result = await pondTankService.updatePondTankStatus({
    membership: req.membership,
    farmId: req.params?.farmId,
    filters: req.query,
    tankId: req.params?.tankId,
    input: req.body,
  })
  return sendData(res, result)
}
