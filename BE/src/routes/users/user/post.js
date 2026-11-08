import { createInvitation, acceptInvitation, changePassword, requestPasswordOtp, resetPasswordWithOtp } from '../../../controllers/users/user/index.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireFarmManager } from '../../../middlewares/auth.middleware.js'

export function registerAcceptInvitation(router) {
  router.post('/accept-invitation', asyncHandler(acceptInvitation))
}

export function registerPublicPasswordOtp(router) {
  router.post('/password-otp', asyncHandler(requestPasswordOtp))
}

export function registerPublicPasswordReset(router) {
  router.post('/password-otp/reset', asyncHandler(resetPasswordWithOtp))
}

export function registerChangePassword(router) {
  router.post('/me/change-password', asyncHandler(changePassword))
}

export function registerProfilePasswordOtp(router) {
  router.post('/me/password-otp', asyncHandler(requestPasswordOtp))
}

export function registerProfilePasswordReset(router) {
  router.post('/me/password-otp/reset', asyncHandler(resetPasswordWithOtp))
}

export function registerCreateInvitation(router) {
  router.post('/invitations', requireFarmManager, asyncHandler(createInvitation))
}
