import { markAlertAssignmentNotificationRead } from '../../../controllers/environment/alert-notification/index.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireEnvironmentThresholdManager } from '../../../middlewares/auth.middleware.js'
import { assignEnvironmentalAlert, setEnvironmentThresholdStatus, markEnvironmentalAlertRead, updateEnvironmentThreshold, updateEnvironmentalAlertStatus } from '../../../controllers/environment/environment-threshold/index.js'

export function registerMarkAlertAssignmentNotificationRead(router) {
  router.patch('/notifications/:notificationId/read', asyncHandler(markAlertAssignmentNotificationRead))
}

export function registerMarkEnvironmentalAlertRead(router) {
  router.patch('/alerts/:alertId/read', asyncHandler(markEnvironmentalAlertRead))
}

export function registerAssignEnvironmentalAlert(router) {
  router.patch('/alerts/:alertId/assignee', asyncHandler(assignEnvironmentalAlert))
}

export function registerUpdateEnvironmentalAlertStatus(router) {
  router.patch('/alerts/:alertId/status', asyncHandler(updateEnvironmentalAlertStatus))
}

export function registerUpdateEnvironmentThreshold(router) {
  router.patch('/:thresholdId', requireEnvironmentThresholdManager, asyncHandler(updateEnvironmentThreshold))
}

export function registerSetEnvironmentThresholdStatus(router) {
  router.patch('/:thresholdId/status', requireEnvironmentThresholdManager, asyncHandler(setEnvironmentThresholdStatus))
}
