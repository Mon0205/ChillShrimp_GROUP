import * as userService from '../../../services/users/user.service.js'
import { sendData } from '../../../utils/http.js'

export async function listUsers(req, res) {
  const result = await userService.listUsers({ filters: req.query, membership: req.membership })
  return sendData(res, result)
}

export async function getProfile(req, res) {
  const result = await userService.getProfile({ actor: req.auth })
  return sendData(res, result)
}

export async function getInvitation(req, res) {
  const result = await userService.getInvitation({ token: req.params.token })
  return sendData(res, result)
}

export async function checkInvitationEmail(req, res) {
  const result = await userService.checkInvitationEmail({ filters: req.query })
  return sendData(res, result)
}

export async function listInvitations(req, res) {
  const result = await userService.listInvitations({ filters: req.query, membership: req.membership })
  return sendData(res, result)
}
