import { updateProfile, updateMembershipStatus, updateManagedUser } from '../../../controllers/users/user/index.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireFarmManager } from '../../../middlewares/auth.middleware.js'

export function registerUpdateProfile(router) {
  router.patch('/me', asyncHandler(updateProfile))
}

export function registerUpdateManagedUser(router) {
  router.patch('/:userId', requireFarmManager, asyncHandler(updateManagedUser))
}

export function registerUpdateMembershipStatus(router) {
  router.patch('/:userId/status', requireFarmManager, asyncHandler(updateMembershipStatus))
}
