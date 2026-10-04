import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireEnvironmentThresholdManager, requireEnvironmentThresholdViewer } from '../middlewares/auth.middleware.js'
import {
  approveEnvironmentThreshold,
  createEnvironmentThreshold,
  getEnvironmentalAlert,
  listEnvironmentalAlerts,
  listEnvironmentThresholds,
  setEnvironmentThresholdStatus,
  markEnvironmentalAlertRead,
  updateEnvironmentThreshold,
} from '../controllers/environment-threshold.controller.js'

export const environmentThresholdRouter = Router({ mergeParams: true })
environmentThresholdRouter.use(requireAuth, requireEnvironmentThresholdViewer)
environmentThresholdRouter.get('/', asyncHandler(listEnvironmentThresholds))
environmentThresholdRouter.get('/alerts', asyncHandler(listEnvironmentalAlerts))
environmentThresholdRouter.get('/alerts/:alertId', asyncHandler(getEnvironmentalAlert))
environmentThresholdRouter.patch('/alerts/:alertId/read', asyncHandler(markEnvironmentalAlertRead))
environmentThresholdRouter.post('/', requireEnvironmentThresholdManager, asyncHandler(createEnvironmentThreshold))
environmentThresholdRouter.patch('/:thresholdId', requireEnvironmentThresholdManager, asyncHandler(updateEnvironmentThreshold))
environmentThresholdRouter.post('/:thresholdId/approve', requireEnvironmentThresholdManager, asyncHandler(approveEnvironmentThreshold))
environmentThresholdRouter.patch('/:thresholdId/status', requireEnvironmentThresholdManager, asyncHandler(setEnvironmentThresholdStatus))
