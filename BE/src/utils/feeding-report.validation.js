const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000

export function parseFeedingReportFilters(query, now = new Date()) {
  const to = query.to ? new Date(query.to) : now
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new Error('Khoảng ngày báo cáo không hợp lệ.')
  if (from > to) throw new Error('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')
  if (to.getTime() - from.getTime() > MAX_RANGE_MS) throw new Error('Khoảng ngày báo cáo tối đa là 366 ngày.')

  const tankId = query.tankId || null
  if (tankId && !UUID_PATTERN.test(tankId)) throw new Error('Mã ao/bể không hợp lệ.')
  return { from, to, tankId }
}
