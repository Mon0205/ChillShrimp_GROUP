import * as userService from '../../../services/users/user.service.js'

export async function revokeInvitation(req, res) {
  await userService.revokeInvitation({ invitationId: req.params.invitationId, actor: req.auth })
  return res.status(204).end()
}
