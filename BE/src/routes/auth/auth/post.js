import { asyncHandler } from '../../../middlewares/async-handler.js'
import { login, logout } from '../../../controllers/auth/auth/index.js'

export function registerLogin(router) {
  router.post('/login', asyncHandler(login))
}

export function registerLogout(router) {
  router.post('/logout', asyncHandler(logout))
}
