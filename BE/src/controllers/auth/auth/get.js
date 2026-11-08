import * as authService from '../../../services/auth/auth.service.js'
import { withAuthContext } from '../../../middlewares/auth-context.js'
import { sendData } from '../../../utils/http.js'

export async function getMe(req, res) {
  const result = await withAuthContext(req, res, () => authService.getMe())
  return sendData(res, result)
}
