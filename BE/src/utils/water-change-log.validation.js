const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeWaterChangeLogInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dữ liệu nhật ký thay nước không hợp lệ.')
  const allowed = new Set(['tankId', 'waterChangePercentage', 'performedAt', 'notes'])
  const unknown = Object.keys(body).find((key) => !allowed.has(key))
  if (unknown) throw new Error(`Trường ${unknown} không được hỗ trợ.`)
  if (typeof body.tankId !== 'string' || !UUID_PATTERN.test(body.tankId)) throw new Error('Mã ao/bể không hợp lệ.')

  const percentage = Number(body.waterChangePercentage)
  if (body.waterChangePercentage === '' || !Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new Error('Tỷ lệ thay nước phải nằm trong khoảng 0 đến 100%.')
  }
  if (Math.abs(percentage * 100 - Math.round(percentage * 100)) > 1e-7) {
    throw new Error('Tỷ lệ thay nước chỉ được có tối đa 2 chữ số thập phân.')
  }

  const performedAt = new Date(body.performedAt)
  if (typeof body.performedAt !== 'string' || !body.performedAt.trim() || Number.isNaN(performedAt.getTime())) {
    throw new Error('Thời điểm thay nước không hợp lệ.')
  }
  const notes = body.notes == null ? null : typeof body.notes === 'string' ? body.notes.trim() || null : undefined
  if (notes === undefined || (notes && notes.length > 4000)) throw new Error('Ghi chú phải là chuỗi và tối đa 4.000 ký tự.')

  return { tankId: body.tankId, waterChangePercentage: percentage, performedAt, notes }
}
