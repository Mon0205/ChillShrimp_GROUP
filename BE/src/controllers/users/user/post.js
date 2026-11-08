import * as userService from '../../../services/users/user.service.js'
import * as passwordService from '../../../services/auth/user-password.service.js'
import { withAuthContext } from '../../../middlewares/auth-context.js'
import { sendData } from '../../../utils/http.js'

export async function createInvitation(req, res) {
  const result = await userService.createInvitation({ input: req.body, membership: req.membership, actor: req.auth })
  return sendData(res, result, 201)
}

export async function acceptInvitation(req, res) {
  const result = await withAuthContext(req, res, () => userService.acceptInvitation({ input: req.body }))
  return sendData(res, result)
}

export async function changePassword(req, res) {
  const result = await withAuthContext(req, res, () => passwordService.changePassword({ input: req.body }))
  return sendData(res, result)
}

export async function requestPasswordOtp(req, res) {
  const result = await passwordService.requestPasswordOtp({ actor: req.auth, input: req.body })
  return sendData(res, result)
}

export async function resetPasswordWithOtp(req, res) {
  const result = await passwordService.resetPasswordWithOtp({ actor: req.auth, input: req.body })
  return sendData(res, result)
}
