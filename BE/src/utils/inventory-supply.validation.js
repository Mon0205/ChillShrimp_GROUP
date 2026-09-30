export const INVENTORY_CATEGORIES = ['feed', 'medicine', 'chemical', 'probiotic', 'other']

function decimal(value, label, { required, scale, max }) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`${label} là bắt buộc.`)
    return undefined
  }
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) {
    throw new Error(`${label} phải là số hợp lệ.`)
  }
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > max) throw new Error(`${label} phải từ 0 đến ${max}.`)
  const factor = 10 ** scale
  if (Math.abs(number * factor - Math.round(number * factor)) > 1e-7) {
    throw new Error(`${label} chỉ được có tối đa ${scale} chữ số thập phân.`)
  }
  return number
}

export function normalizeInventorySupplyInput(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dữ liệu vật tư không hợp lệ.')
  const allowed = new Set(['name', 'category', 'unit', 'unitPrice', 'minThreshold', 'description'])
  const unknown = Object.keys(body).find((field) => !allowed.has(field))
  if (unknown) {
    if (unknown === 'quantity') throw new Error('Không thể sửa tồn kho tại danh mục; hãy dùng chức năng giao dịch kho.')
    throw new Error(`Trường ${unknown} không được hỗ trợ.`)
  }

  const data = {}
  if (!partial || Object.hasOwn(body, 'name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 150) throw new Error('Tên vật tư là bắt buộc và tối đa 150 ký tự.')
    data.name = name
  }
  if (!partial || Object.hasOwn(body, 'category')) {
    if (!INVENTORY_CATEGORIES.includes(body.category)) throw new Error('Loại vật tư không hợp lệ.')
    data.category = body.category
  }
  if (!partial || Object.hasOwn(body, 'unit')) {
    const unit = typeof body.unit === 'string' ? body.unit.trim() : ''
    if (!unit || unit.length > 20) throw new Error('Đơn vị tính là bắt buộc và tối đa 20 ký tự.')
    data.unit = unit
  }
  if (!partial || Object.hasOwn(body, 'unitPrice')) data.unitPrice = decimal(body.unitPrice, 'Đơn giá', { required: !partial, scale: 2, max: 9_999_999_999.99 })
  if (!partial || Object.hasOwn(body, 'minThreshold')) data.minThreshold = decimal(body.minThreshold, 'Ngưỡng tồn', { required: !partial, scale: 3, max: 999_999_999.999 })
  if (Object.hasOwn(body, 'description')) {
    if (body.description !== null && typeof body.description !== 'string') throw new Error('Mô tả phải là chuỗi hoặc để trống.')
    if (typeof body.description === 'string' && body.description.length > 4000) throw new Error('Mô tả tối đa 4.000 ký tự.')
    data.description = typeof body.description === 'string' ? body.description.trim() || null : null
  }
  if (partial && !Object.keys(data).length) throw new Error('Không có thông tin vật tư cần cập nhật.')
  return data
}
