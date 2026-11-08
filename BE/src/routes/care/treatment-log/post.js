import { asyncHandler } from '../../../middlewares/async-handler.js'
import { createTreatmentLog } from '../../../controllers/care/treatment-log/index.js'

export function registerCreateTreatmentLog(router) {
  router.post('/', asyncHandler(createTreatmentLog))
}
