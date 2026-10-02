const FEED_CHECK_STATUSES = new Set(['consumed', 'leftover', 'not_checked'])

function optionalNumber(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === '') return null
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) {
    throw new Error(`${field} phải là số hợp lệ.`)
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${field} phải là số từ ${min} đến ${max}.`)
  }
  if (Math.abs(parsed * 1000 - Math.round(parsed * 1000)) > 1e-7) {
    throw new Error(`${field} chỉ được có tối đa 3 chữ số thập phân.`)
  }
  return parsed
}

export function normalizeFeedingLogInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dữ liệu nhật ký không hợp lệ.')

  const allowedFields = new Set(['tankId', 'supplyId', 'feedName', 'amount', 'unit', 'biomassSnapshotKg', 'feedingRatePercent', 'recommendedAmount', 'feedCheckStatus', 'feedingTime', 'notes'])
  const unknownField = Object.keys(body).find((field) => !allowedFields.has(field))
  if (unknownField) throw new Error(`Trường ${unknownField} không được hỗ trợ.`)

  const feedName = typeof body.feedName === 'string' ? body.feedName.trim() : ''
  if (!feedName || feedName.length > 150) throw new Error('Tên thức ăn là bắt buộc và tối đa 150 ký tự.')

  const unit = typeof body.unit === 'string' ? body.unit.trim() : ''
  if (!unit || unit.length > 20) throw new Error('Đơn vị tính là bắt buộc và tối đa 20 ký tự.')

  const supplyId = body.supplyId == null || body.supplyId === '' ? null : body.supplyId
  if (supplyId !== null && (typeof supplyId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(supplyId))) {
    throw new Error('Mã vật tư thức ăn không hợp lệ.')
  }

  const amount = optionalNumber(body.amount, 'Lượng thức ăn', { min: 0.001, max: 1_000_000_000 })
  const biomassSnapshotKg = optionalNumber(body.biomassSnapshotKg, 'Sinh khối', { min: 0.001, max: 1_000_000_000 })
  const feedingRatePercent = optionalNumber(body.feedingRatePercent, 'Tỷ lệ cho ăn', { min: 0, max: 100 })
  const recommendedAmount = optionalNumber(body.recommendedAmount, 'Lượng khuyến nghị', { max: 1_000_000_000 })

  const feedingTime = new Date(body.feedingTime)
  if (typeof body.feedingTime !== 'string' || !body.feedingTime.trim() || Number.isNaN(feedingTime.getTime())) {
    throw new Error('Thời gian cho ăn không hợp lệ.')
  }

  const feedCheckStatus = body.feedCheckStatus || null
  if (feedCheckStatus !== null && !FEED_CHECK_STATUSES.has(feedCheckStatus)) {
    throw new Error('Trạng thái kiểm tra sàng ăn không hợp lệ.')
  }

  const notes = body.notes == null ? null : typeof body.notes === 'string' ? body.notes.trim() || null : undefined
  if (notes === undefined || (notes && notes.length > 4000)) throw new Error('Ghi chú phải là chuỗi và tối đa 4.000 ký tự.')

  return { supplyId, feedName, amount, unit, biomassSnapshotKg, feedingRatePercent, recommendedAmount, feedCheckStatus, feedingTime, notes }
}
