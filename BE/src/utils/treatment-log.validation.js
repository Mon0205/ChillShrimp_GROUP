const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeTreatmentLogInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dữ liệu nhật ký thuốc/chế phẩm không hợp lệ.')
  const allowed = new Set(['tankId', 'supplyId', 'productName', 'amount', 'unit', 'purpose', 'performedAt', 'notes'])
  const unknown = Object.keys(body).find((key) => !allowed.has(key))
  if (unknown) throw new Error(`Trường ${unknown} không được hỗ trợ.`)
  if (typeof body.tankId !== 'string' || !UUID_PATTERN.test(body.tankId)) throw new Error('Mã ao/bể không hợp lệ.')

  const supplyId = body.supplyId == null || body.supplyId === '' ? null : body.supplyId
  if (supplyId !== null && (typeof supplyId !== 'string' || !UUID_PATTERN.test(supplyId))) throw new Error('Mã vật tư không hợp lệ.')

  const productName = typeof body.productName === 'string' ? body.productName.trim() : ''
  if (!productName || productName.length > 150) throw new Error('Tên thuốc/chế phẩm là bắt buộc và tối đa 150 ký tự.')

  const amount = Number(body.amount)
  if (!['number', 'string'].includes(typeof body.amount) || (typeof body.amount === 'string' && !body.amount.trim()) || !Number.isFinite(amount) || amount <= 0 || amount > 999_999_999.999) {
    throw new Error('Liều lượng phải lớn hơn 0 và nằm trong giới hạn cho phép.')
  }
  if (Math.abs(amount * 1000 - Math.round(amount * 1000)) > 1e-7) throw new Error('Liều lượng chỉ được có tối đa 3 chữ số thập phân.')

  const unit = typeof body.unit === 'string' ? body.unit.trim() : ''
  if (!unit || unit.length > 20) throw new Error('Đơn vị là bắt buộc và tối đa 20 ký tự.')
  const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : ''
  if (!purpose || purpose.length > 4000) throw new Error('Mục đích sử dụng là bắt buộc và tối đa 4.000 ký tự.')

  const performedAt = new Date(body.performedAt)
  if (typeof body.performedAt !== 'string' || !body.performedAt.trim() || Number.isNaN(performedAt.getTime())) throw new Error('Thời điểm thực hiện không hợp lệ.')
  const notes = body.notes == null ? null : typeof body.notes === 'string' ? body.notes.trim() || null : undefined
  if (notes === undefined || (notes && notes.length > 4000)) throw new Error('Ghi chú phải là chuỗi và tối đa 4.000 ký tự.')

  return { tankId: body.tankId, supplyId, productName, amount, unit, purpose, performedAt, notes }
}
