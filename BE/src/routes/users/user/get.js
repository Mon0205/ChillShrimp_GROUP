import { listUsers, getProfile, getInvitation, checkInvitationEmail, listInvitations } from '../../../controllers/users/user/index.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'
import { requireFarmManager } from '../../../middlewares/auth.middleware.js'

export function registerGetInvitation(router) {
  router.get('/invitation/:token', asyncHandler(getInvitation))
}

export function registerGetProfile(router) {
  router.get('/me', asyncHandler(getProfile))
}

export function registerListUsers(router) {
  router.get('/', requireFarmManager, asyncHandler(listUsers))
}

export function registerCheckInvitationEmail(router) {
  router.get('/invitations/check-email', requireFarmManager, asyncHandler(checkInvitationEmail))
}

export function registerListInvitations(router) {
  router.get('/invitations', requireFarmManager, asyncHandler(listInvitations))
}
