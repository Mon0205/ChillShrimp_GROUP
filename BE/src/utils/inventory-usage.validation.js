const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeInventoryUsageInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dữ liệu sử dụng vật tư không hợp lệ.')
  const allowed = new Set(['supplyId', 'batchId', 'quantity', 'transactionDate', 'notes'])
  const unknown = Object.keys(body).find((field) => !allowed.has(field))
  if (unknown) throw new Error(`Trường ${unknown} không được hỗ trợ.`)
  if (typeof body.supplyId !== 'string' || !UUID_PATTERN.test(body.supplyId)) throw new Error('Mã vật tư không hợp lệ.')

  const batchId = body.batchId == null || body.batchId === '' ? null : body.batchId
  if (batchId !== null && (typeof batchId !== 'string' || !UUID_PATTERN.test(batchId))) throw new Error('Mã lô giống không hợp lệ.')

  if (!['number', 'string'].includes(typeof body.quantity) || (typeof body.quantity === 'string' && !body.quantity.trim())) {
    throw new Error('Số lượng sử dụng phải là số hợp lệ.')
  }
  const quantity = Number(body.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 999_999_999.999) throw new Error('Số lượng sử dụng phải lớn hơn 0 và nằm trong giới hạn cho phép.')
  if (Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 1e-7) throw new Error('Số lượng sử dụng chỉ được có tối đa 3 chữ số thập phân.')

  const transactionDate = new Date(body.transactionDate)
  if (typeof body.transactionDate !== 'string' || !body.transactionDate.trim() || Number.isNaN(transactionDate.getTime())) {
    throw new Error('Thời điểm sử dụng không hợp lệ.')
  }
  const notes = body.notes == null ? null : typeof body.notes === 'string' ? body.notes.trim() || null : undefined
  if (notes === undefined || (notes && notes.length > 4000)) throw new Error('Ghi chú phải là chuỗi và tối đa 4.000 ký tự.')

  return { supplyId: body.supplyId, batchId, quantity, transactionDate, notes }
}
