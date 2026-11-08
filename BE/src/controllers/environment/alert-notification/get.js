import * as service from '../../../services/environment/alert-notification.service.js'
import { sendData } from '../../../utils/http.js'

export async function listAlertAssignmentNotifications(req, res) {
  const result = await service.listAlertAssignmentNotifications({ filters: req.query, farmId: req.params.farmId, actor: req.auth })
  return sendData(res, result)
}
