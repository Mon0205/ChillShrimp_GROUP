import * as service from '../../../services/environment/environment-threshold.service.js'
import { sendData } from '../../../utils/http.js'

export async function listEnvironmentThresholds(req, res) {
  const result = await service.listEnvironmentThresholds({ farmId: req.params.farmId })
  return sendData(res, result)
}

export async function listEnvironmentalAlerts(req, res) {
  const result = await service.listEnvironmentalAlerts({ actor: req.auth, filters: req.query, farmId: req.params.farmId, membership: req.membership })
  return sendData(res, result)
}

export async function getEnvironmentalAlert(req, res) {
  const result = await service.getEnvironmentalAlert({ alertId: req.params.alertId, actor: req.auth, farmId: req.params.farmId, membership: req.membership })
  return sendData(res, result)
}

export async function listEnvironmentalAlertAssignees(req, res) {
  const result = await service.listEnvironmentalAlertAssignees({ alertId: req.params.alertId, farmId: req.params.farmId, actor: req.auth, membership: req.membership })
  return sendData(res, result)
}
