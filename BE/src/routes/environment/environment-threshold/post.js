import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireEnvironmentThresholdManager } from '../../../middlewares/auth.middleware.js'
import { claimEnvironmentalAlert, approveEnvironmentThreshold, createEnvironmentThreshold } from '../../../controllers/environment/environment-threshold/index.js'

export function registerClaimEnvironmentalAlert(router) {
  router.post('/alerts/:alertId/claim', asyncHandler(claimEnvironmentalAlert))
}

export function registerCreateEnvironmentThreshold(router) {
  router.post('/', requireEnvironmentThresholdManager, asyncHandler(createEnvironmentThreshold))
}

export function registerApproveEnvironmentThreshold(router) {
  router.post('/:thresholdId/approve', requireEnvironmentThresholdManager, asyncHandler(approveEnvironmentThreshold))
}
