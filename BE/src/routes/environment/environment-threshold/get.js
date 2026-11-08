import { listAlertAssignmentNotifications } from '../../../controllers/environment/alert-notification/index.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'
import { listEnvironmentalAlertAssignees, getEnvironmentalAlert, listEnvironmentalAlerts, listEnvironmentThresholds } from '../../../controllers/environment/environment-threshold/index.js'

export function registerListEnvironmentThresholds(router) {
  router.get('/', asyncHandler(listEnvironmentThresholds))
}

export function registerListAlertAssignmentNotifications(router) {
  router.get('/notifications', asyncHandler(listAlertAssignmentNotifications))
}

export function registerListEnvironmentalAlerts(router) {
  router.get('/alerts', asyncHandler(listEnvironmentalAlerts))
}

export function registerGetEnvironmentalAlert(router) {
  router.get('/alerts/:alertId', asyncHandler(getEnvironmentalAlert))
}

export function registerListEnvironmentalAlertAssignees(router) {
  router.get('/alerts/:alertId/assignees', asyncHandler(listEnvironmentalAlertAssignees))
}
