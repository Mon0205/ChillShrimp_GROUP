const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function decimal(value, label, { max, scale, allowZero = false }) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) {
    throw new Error(`${label} phải là số hợp lệ.`)
  }
  const number = Number(value)
  if (!Number.isFinite(number) || number > max || (allowZero ? number < 0 : number <= 0)) {
    throw new Error(`${label} nằm ngoài khoảng cho phép.`)
  }
  const factor = 10 ** scale
  if (Math.abs(number * factor - Math.round(number * factor)) > 1e-7) {
    throw new Error(`${label} chỉ được có tối đa ${scale} chữ số thập phân.`)
  }
  return number
}

export function normalizeInventoryImportInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dữ liệu nhập kho không hợp lệ.')
  const allowed = new Set(['supplyId', 'quantity', 'unitPrice', 'transactionDate', 'notes'])
  const unknown = Object.keys(body).find((key) => !allowed.has(key))
  if (unknown) throw new Error(`Trường ${unknown} không được hỗ trợ.`)
  if (typeof body.supplyId !== 'string' || !UUID_PATTERN.test(body.supplyId)) throw new Error('Mã vật tư không hợp lệ.')

  const quantity = decimal(body.quantity, 'Số lượng', { max: 999_999_999.999, scale: 3 })
  const unitPrice = decimal(body.unitPrice, 'Đơn giá', { max: 9_999_999_999.99, scale: 2, allowZero: true })
  const transactionDate = new Date(body.transactionDate)
  if (typeof body.transactionDate !== 'string' || !body.transactionDate.trim() || Number.isNaN(transactionDate.getTime())) {
    throw new Error('Thời điểm nhập kho không hợp lệ.')
  }
  const notes = body.notes == null ? null : typeof body.notes === 'string' ? body.notes.trim() || null : undefined
  if (notes === undefined || (notes && notes.length > 4000)) throw new Error('Ghi chú phải là chuỗi và tối đa 4.000 ký tự.')

  return { supplyId: body.supplyId, quantity, unitPrice, transactionDate, notes }
}
