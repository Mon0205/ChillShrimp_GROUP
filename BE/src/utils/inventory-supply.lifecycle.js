import { createHttpError } from './http.js'

export function assertInventorySupplyDeletable({ quantity, transactionCount }) {
  if (!quantity.isZero()) {
    throw createHttpError(409, 'Chỉ có thể xóa vật tư khi tồn kho bằng 0. Hãy xử lý tồn kho qua giao dịch trước.')
  }
  if (transactionCount > 0) {
    throw createHttpError(409, 'Vật tư đã có lịch sử giao dịch kho nên không thể xóa.')
  }
}
