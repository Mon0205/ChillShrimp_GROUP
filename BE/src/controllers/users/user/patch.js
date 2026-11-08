import * as userService from '../../../services/users/user.service.js'
import { sendData } from '../../../utils/http.js'

export async function updateProfile(req, res) {
  const result = await userService.updateProfile({ input: req.body, actor: req.auth })
  return sendData(res, result)
}

export async function updateMembershipStatus(req, res) {
  const result = await userService.updateMembershipStatus({ input: req.body, userId: req.params.userId, actor: req.auth, membership: req.membership })
  return sendData(res, result)
}

export async function updateManagedUser(req, res) {
  const result = await userService.updateManagedUser({ input: req.body, userId: req.params.userId, actor: req.auth, membership: req.membership })
  return sendData(res, result)
}
