const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeInventoryRequestInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dữ liệu yêu cầu không hợp lệ.')
  const allowed = new Set(['supplyId', 'areaId', 'tankId', 'quantity', 'notes'])
  const unknown = Object.keys(body).find((key) => !allowed.has(key))
  if (unknown) throw new Error(`Trường ${unknown} không được hỗ trợ.`)
  if (typeof body.supplyId !== 'string' || !UUID_PATTERN.test(body.supplyId)) throw new Error('Mã vật tư không hợp lệ.')
  if (typeof body.tankId !== 'string' || !UUID_PATTERN.test(body.tankId)) throw new Error('Bắt buộc chọn ao/bể nhận vật tư hợp lệ.')
  const areaId = body.areaId == null || body.areaId === '' ? null : body.areaId
  if (areaId !== null && (typeof areaId !== 'string' || !UUID_PATTERN.test(areaId))) throw new Error('Mã khu vực không hợp lệ.')
  if (!['number', 'string'].includes(typeof body.quantity) || (typeof body.quantity === 'string' && !body.quantity.trim())) {
    throw new Error('Số lượng yêu cầu phải là số hợp lệ.')
  }
  const quantity = Number(body.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 999_999_999.999) throw new Error('Số lượng yêu cầu phải lớn hơn 0 và nằm trong giới hạn cho phép.')
  if (Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 1e-7) throw new Error('Số lượng chỉ được có tối đa 3 chữ số thập phân.')
  const notes = body.notes == null ? null : typeof body.notes === 'string' ? body.notes.trim() || null : undefined
  if (notes === undefined || (notes && notes.length > 4000)) throw new Error('Ghi chú phải là chuỗi và tối đa 4.000 ký tự.')
  return { supplyId: body.supplyId, areaId, tankId: body.tankId, quantity, notes }
}

export function normalizeInventoryAdjustmentInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dữ liệu điều chỉnh không hợp lệ.')
  const allowed = new Set(['supplyId', 'direction', 'quantity', 'transactionDate', 'reason'])
  const unknown = Object.keys(body).find((key) => !allowed.has(key))
  if (unknown) throw new Error(`Trường ${unknown} không được hỗ trợ.`)
  if (typeof body.supplyId !== 'string' || !UUID_PATTERN.test(body.supplyId)) throw new Error('Mã vật tư không hợp lệ.')
  if (!['increase', 'decrease'].includes(body.direction)) throw new Error('Chiều điều chỉnh không hợp lệ.')
  if (!['number', 'string'].includes(typeof body.quantity) || (typeof body.quantity === 'string' && !body.quantity.trim())) throw new Error('Số lượng điều chỉnh phải là số hợp lệ.')
  const amount = Number(body.quantity)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999.999) throw new Error('Số lượng điều chỉnh phải lớn hơn 0 và nằm trong giới hạn cho phép.')
  if (Math.abs(amount * 1000 - Math.round(amount * 1000)) > 1e-7) throw new Error('Số lượng chỉ được có tối đa 3 chữ số thập phân.')
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (!reason || reason.length > 4000) throw new Error('Lý do điều chỉnh là bắt buộc và tối đa 4.000 ký tự.')
  const transactionDate = new Date(body.transactionDate)
  if (typeof body.transactionDate !== 'string' || !body.transactionDate.trim() || Number.isNaN(transactionDate.getTime())) throw new Error('Thời điểm điều chỉnh không hợp lệ.')
  return { supplyId: body.supplyId, quantity: body.direction === 'decrease' ? -amount : amount, transactionDate, reason }
}
