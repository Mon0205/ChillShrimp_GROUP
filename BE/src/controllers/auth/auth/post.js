import * as authService from '../../../services/auth/auth.service.js'
import { withAuthContext } from '../../../middlewares/auth-context.js'
import { sendData } from '../../../utils/http.js'

export async function login(req, res) {
  const result = await withAuthContext(req, res, () => authService.login({ input: req.body }))
  return sendData(res, result)
}

export async function logout(req, res) {
  const result = await withAuthContext(req, res, () => authService.logout())
  return sendData(res, result)
}
