import { asyncHandler } from '../../../middlewares/async-handler.js'
import { listTreatmentLogs } from '../../../controllers/care/treatment-log/index.js'

export function registerListTreatmentLogs(router) {
  router.get('/', asyncHandler(listTreatmentLogs))
}
