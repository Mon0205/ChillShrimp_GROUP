const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MEASUREMENT_FIELDS = [
  'temperature', 'ph', 'salinity', 'dissolvedOxygen', 'nh3', 'tan',
  'no2', 'nitrate', 'alkalinity', 'h2s', 'turbidity', 'waterLevelM',
]
const METHODS = new Set(['manual', 'iot', 'lab'])

function optionalMeasurement(value, field, { allowNegative = false } = {}) {
  if (value === undefined || value === null || value === '') return null
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) {
    throw new Error(`${field} phải là số hợp lệ.`)
  }
  const number = Number(value)
  if (!Number.isFinite(number) || (!allowNegative && number < 0) || number < -999_999_999.999 || number > 999_999_999.999) {
    throw new Error(`${field} phải từ 0 đến 999.999.999,999.`)
  }
  if (Math.abs(number * 1000 - Math.round(number * 1000)) > 1e-7) {
    throw new Error(`${field} chỉ được có tối đa 3 chữ số thập phân.`)
  }
  return number
}

export function normalizeWaterParameterLogInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dữ liệu môi trường không hợp lệ.')
  const allowed = new Set(['tankId', ...MEASUREMENT_FIELDS, 'measurementMethod', 'measurementDevice', 'recordedAt', 'notes'])
  const unknown = Object.keys(body).find((key) => !allowed.has(key))
  if (unknown) throw new Error(`Trường ${unknown} không được hỗ trợ.`)
  if (typeof body.tankId !== 'string' || !UUID_PATTERN.test(body.tankId)) throw new Error('Mã ao/bể không hợp lệ.')

  const values = Object.fromEntries(MEASUREMENT_FIELDS.map((field) => [
    field,
    optionalMeasurement(body[field], field, { allowNegative: field === 'temperature' }),
  ]))
  if (MEASUREMENT_FIELDS.every((field) => values[field] === null)) throw new Error('Cần nhập ít nhất một thông số đã đo.')
  if (values.ph !== null && values.ph > 14) throw new Error('pH phải nằm trong khoảng 0 đến 14.')

  const measurementMethod = body.measurementMethod || 'manual'
  if (!METHODS.has(measurementMethod)) throw new Error('Phương pháp đo không hợp lệ.')
  const measurementDevice = body.measurementDevice == null ? null : typeof body.measurementDevice === 'string' ? body.measurementDevice.trim() || null : undefined
  if (measurementDevice === undefined || (measurementDevice && measurementDevice.length > 100)) {
    throw new Error('Thiết bị đo phải là chuỗi và tối đa 100 ký tự.')
  }
  const recordedAt = new Date(body.recordedAt)
  if (typeof body.recordedAt !== 'string' || !body.recordedAt.trim() || Number.isNaN(recordedAt.getTime())) {
    throw new Error('Thời điểm đo không hợp lệ.')
  }
  const notes = body.notes == null ? null : typeof body.notes === 'string' ? body.notes.trim() || null : undefined
  if (notes === undefined || (notes && notes.length > 4000)) throw new Error('Ghi chú phải là chuỗi và tối đa 4.000 ký tự.')

  return { tankId: body.tankId, ...values, measurementMethod, measurementDevice, recordedAt, notes }
}
