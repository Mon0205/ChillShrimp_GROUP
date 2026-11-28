// Every screen shows and reads times in Vietnam time, whatever the time zone of the device.
const TIME_ZONE = 'Asia/Ho_Chi_Minh'
const OFFSET = '+07:00' // Vietnam has no daylight saving time

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

function parts(value) {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
}

// dd/MM/yyyy
export function formatDate(value, empty = '—') {
  const p = parts(value)
  return p ? `${p.day}/${p.month}/${p.year}` : empty
}

// HH:mm dd/MM/yyyy
export function formatDateTime(value, empty = '—') {
  const p = parts(value)
  return p ? `${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}` : empty
}

export function formatTime(value, empty = '') {
  const p = parts(value)
  return p ? `${p.hour}:${p.minute}` : empty
}

// Short label for a chart axis, where the year would not fit.
export function formatChartTime(value) {
  const p = parts(value)
  return p ? `${p.hour}:${p.minute} ${p.day}/${p.month}` : ''
}

// Value of an <input type="date">.
export function toDateInput(value = new Date()) {
  const p = parts(value)
  return p ? `${p.year}-${p.month}-${p.day}` : ''
}

// Value of an <input type="datetime-local">, and the instant such a value stands for.
export function toDateTimeInput(value = new Date()) {
  const p = parts(value)
  return p ? `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` : ''
}

export const fromDateTimeInput = (text) => new Date(`${text}${OFFSET}`)
export const startOfDay = (day) => new Date(`${day}T00:00:00${OFFSET}`)
export const endOfDay = (day) => new Date(`${day}T23:59:59.999${OFFSET}`)
