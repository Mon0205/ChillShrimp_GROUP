// Small formatters shared by the dashboard components (Vietnamese number style, money in đồng).

export const money = (value) => `${Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ`
export const count = (value) => Number(value || 0).toLocaleString('vi-VN')
export const amount = (value) => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })

// Short money for chart labels: "210 tr", "1,2 tỷ".
export function compactMoney(value) {
  const number = Number(value || 0)
  if (number >= 1e9) return `${(number / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`
  if (number >= 1e6) return `${(number / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} tr`
  if (number >= 1e3) return `${(number / 1e3).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} nghìn`
  return '0'
}

// The axis top is the next "round" value above the highest bar, so bars keep their scale.
export function niceMax(value) {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  return [1, 2, 2.5, 5, 10].find((step) => step * power >= value) * power
}

// Today's date in Vietnam (UTC+7, no daylight saving), whatever the browser's time zone.
export function vietnamToday(now = Date.now()) {
  const local = new Date(now + 7 * 60 * 60 * 1000)
  const day = String(local.getUTCDate()).padStart(2, '0')
  const month = String(local.getUTCMonth() + 1).padStart(2, '0')
  return { label: `${day}/${month}`, iso: `${local.getUTCFullYear()}-${month}-${day}`, month: `${local.getUTCFullYear()}-${month}` }
}

// Whole days from today to a "YYYY-MM-DD" date: negative when the date has passed.
export function daysFromToday(isoDate, now = Date.now()) {
  if (!isoDate) return null
  const target = Date.parse(`${isoDate}T00:00:00Z`)
  const today = Date.parse(`${vietnamToday(now).iso}T00:00:00Z`)
  return Math.round((target - today) / 86400000)
}

export const dayMonth = (isoDate) => (isoDate ? `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}/${isoDate.slice(0, 4)}` : '—')
