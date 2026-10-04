const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function decimal(value, label, { max, scale, allowZero = false }) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) {
    throw new Error(`${label} must be a valid number.`)
  }
  const number = Number(value)
  if (!Number.isFinite(number) || number > max || (allowZero ? number < 0 : number <= 0)) {
    throw new Error(`${label} is outside the allowed range.`)
  }
  const factor = 10 ** scale
  if (Math.abs(number * factor - Math.round(number * factor)) > 1e-7) {
    throw new Error(`${label} supports at most ${scale} decimal places.`)
  }
  return number
}

export function normalizeInventoryImportInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Import data is invalid.')
  const allowed = new Set(['supplyId', 'quantity', 'unitPrice', 'transactionDate', 'notes'])
  const unknown = Object.keys(body).find((key) => !allowed.has(key))
  if (unknown) throw new Error(`Field ${unknown} is not supported.`)
  if (typeof body.supplyId !== 'string' || !UUID_PATTERN.test(body.supplyId)) throw new Error('Supply id is invalid.')

  const quantity = decimal(body.quantity, 'Quantity', { max: 999_999_999.999, scale: 3 })
  const unitPrice = decimal(body.unitPrice, 'Unit price', { max: 9_999_999_999.99, scale: 2, allowZero: true })
  const transactionDate = new Date(body.transactionDate)
  if (typeof body.transactionDate !== 'string' || !body.transactionDate.trim() || Number.isNaN(transactionDate.getTime())) {
    throw new Error('Transaction date is invalid.')
  }
  const notes = body.notes == null ? null : typeof body.notes === 'string' ? body.notes.trim() || null : undefined
  if (notes === undefined || (notes && notes.length > 4000)) throw new Error('Notes must be text with at most 4000 characters.')

  return { supplyId: body.supplyId, quantity, unitPrice, transactionDate, notes }
}
