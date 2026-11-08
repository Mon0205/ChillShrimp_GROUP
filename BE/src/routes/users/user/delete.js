import { revokeInvitation } from '../../../controllers/users/user/index.js'
import { asyncHandler } from '../../../middlewares/async-handler.js'

export function registerRevokeInvitation(router) {
  router.delete('/invitations/:invitationId', asyncHandler(revokeInvitation))
}
