import { asyncHandler } from '../../../middlewares/async-handler.js'
import { getMe } from '../../../controllers/auth/auth/index.js'

export function registerGetMe(router) {
  router.get('/me', asyncHandler(getMe))
}
