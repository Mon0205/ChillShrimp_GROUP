import * as service from '../../../services/environment/environment-threshold.service.js'
import { sendData } from '../../../utils/http.js'

export async function updateEnvironmentThreshold(req, res) {
  const result = await service.updateEnvironmentThreshold({ thresholdId: req.params.thresholdId, farmId: req.params.farmId, actor: req.auth, input: req.body })
  return sendData(res, result.threshold, result.revisionCreated ? 201 : 200)
}

export async function setEnvironmentThresholdStatus(req, res) {
  const result = await service.setEnvironmentThresholdStatus({ thresholdId: req.params.thresholdId, farmId: req.params.farmId, input: req.body })
  return sendData(res, result)
}

export async function markEnvironmentalAlertRead(req, res) {
  const result = await service.markEnvironmentalAlertRead({ alertId: req.params.alertId, actor: req.auth, farmId: req.params.farmId, membership: req.membership })
  return sendData(res, result)
}

export async function assignEnvironmentalAlert(req, res) {
  const result = await service.assignEnvironmentalAlert({ farmId: req.params.farmId, actor: req.auth, input: req.body, alertId: req.params.alertId, membership: req.membership })
  return sendData(res, result)
}

export async function updateEnvironmentalAlertStatus(req, res) {
  const result = await service.updateEnvironmentalAlertStatus({ actor: req.auth, input: req.body, farmId: req.params.farmId, alertId: req.params.alertId, membership: req.membership })
  return sendData(res, result)
}
