import * as service from '../../../services/environment/environment-threshold.service.js'
import { sendData } from '../../../utils/http.js'

export async function createEnvironmentThreshold(req, res) {
  const result = await service.createEnvironmentThreshold({ farmId: req.params.farmId, actor: req.auth, input: req.body })
  return sendData(res, result, 201)
}

export async function approveEnvironmentThreshold(req, res) {
  const result = await service.approveEnvironmentThreshold({ thresholdId: req.params.thresholdId, farmId: req.params.farmId, actor: req.auth })
  return sendData(res, result)
}

export async function claimEnvironmentalAlert(req, res) {
  const result = await service.claimEnvironmentalAlert({ actor: req.auth, input: req.body, farmId: req.params.farmId, alertId: req.params.alertId, membership: req.membership })
  return sendData(res, result)
}
