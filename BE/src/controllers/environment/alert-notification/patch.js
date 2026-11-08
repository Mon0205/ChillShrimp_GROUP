import * as service from '../../../services/environment/alert-notification.service.js'
import { sendData } from '../../../utils/http.js'

export async function markAlertAssignmentNotificationRead(req, res) {
  const result = await service.markAlertAssignmentNotificationRead({ notificationId: req.params.notificationId, farmId: req.params.farmId, actor: req.auth })
  return sendData(res, result)
}
