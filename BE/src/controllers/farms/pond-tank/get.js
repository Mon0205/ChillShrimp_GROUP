import * as pondTankService from '../../../services/farms/pond-tank.service.js'
import { sendData } from '../../../utils/http.js'

export async function listAvailableTechnicians(req, res) {
  const result = await pondTankService.listAvailableTechnicians({
    membership: req.membership,
    farmId: req.params?.farmId,
    filters: req.query,
    tankId: req.params?.tankId,
    input: req.body,
  })
  return sendData(res, result)
}

export async function listPondTanks(req, res) {
  const result = await pondTankService.listPondTanks({
    membership: req.membership,
    farmId: req.params?.farmId,
    filters: req.query,
    tankId: req.params?.tankId,
    input: req.body,
  })
  return sendData(res, result)
}

export async function getPondTank(req, res) {
  const result = await pondTankService.getPondTank({
    membership: req.membership,
    farmId: req.params?.farmId,
    filters: req.query,
    tankId: req.params?.tankId,
    input: req.body,
  })
  return sendData(res, result)
}
