const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeInventoryRequestInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dá»¯ liá»‡u yÃªu cáº§u khÃ´ng há»£p lá»‡.')
  const allowed = new Set(['supplyId', 'areaId', 'quantity', 'notes'])
  const unknown = Object.keys(body).find((key) => !allowed.has(key))
  if (unknown) throw new Error(`TrÆ°á»ng ${unknown} khÃ´ng Ä‘Æ°á»£c há»— trá»£.`)
  if (typeof body.supplyId !== 'string' || !UUID_PATTERN.test(body.supplyId)) throw new Error('MÃ£ váº­t tÆ° khÃ´ng há»£p lá»‡.')
  const areaId = body.areaId == null || body.areaId === '' ? null : body.areaId
  if (areaId !== null && (typeof areaId !== 'string' || !UUID_PATTERN.test(areaId))) throw new Error('MÃ£ khu vá»±c khÃ´ng há»£p lá»‡.')
  if (!['number', 'string'].includes(typeof body.quantity) || (typeof body.quantity === 'string' && !body.quantity.trim())) {
    throw new Error('Sá»‘ lÆ°á»£ng yÃªu cáº§u pháº£i lÃ  sá»‘ há»£p lá»‡.')
  }
  const quantity = Number(body.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 999_999_999.999) throw new Error('Sá»‘ lÆ°á»£ng yÃªu cáº§u pháº£i lá»›n hÆ¡n 0 vÃ  náº±m trong giá»›i háº¡n cho phÃ©p.')
  if (Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 1e-7) throw new Error('Sá»‘ lÆ°á»£ng chá»‰ Ä‘Æ°á»£c cÃ³ tá»‘i Ä‘a 3 chá»¯ sá»‘ tháº­p phÃ¢n.')
  const notes = body.notes == null ? null : typeof body.notes === 'string' ? body.notes.trim() || null : undefined
  if (notes === undefined || (notes && notes.length > 4000)) throw new Error('Ghi chÃº pháº£i lÃ  chuá»—i vÃ  tá»‘i Ä‘a 4.000 kÃ½ tá»±.')
  return { supplyId: body.supplyId, areaId, quantity, notes }
}

export function normalizeInventoryAdjustmentInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dá»¯ liá»‡u Ä‘iá»u chá»‰nh khÃ´ng há»£p lá»‡.')
  const allowed = new Set(['supplyId', 'direction', 'quantity', 'transactionDate', 'reason'])
  const unknown = Object.keys(body).find((key) => !allowed.has(key))
  if (unknown) throw new Error(`TrÆ°á»ng ${unknown} khÃ´ng Ä‘Æ°á»£c há»— trá»£.`)
  if (typeof body.supplyId !== 'string' || !UUID_PATTERN.test(body.supplyId)) throw new Error('MÃ£ váº­t tÆ° khÃ´ng há»£p lá»‡.')
  if (!['increase', 'decrease'].includes(body.direction)) throw new Error('Chiá»u Ä‘iá»u chá»‰nh khÃ´ng há»£p lá»‡.')
  if (!['number', 'string'].includes(typeof body.quantity) || (typeof body.quantity === 'string' && !body.quantity.trim())) throw new Error('Sá»‘ lÆ°á»£ng Ä‘iá»u chá»‰nh pháº£i lÃ  sá»‘ há»£p lá»‡.')
  const amount = Number(body.quantity)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999.999) throw new Error('Sá»‘ lÆ°á»£ng Ä‘iá»u chá»‰nh pháº£i lá»›n hÆ¡n 0 vÃ  náº±m trong giá»›i háº¡n cho phÃ©p.')
  if (Math.abs(amount * 1000 - Math.round(amount * 1000)) > 1e-7) throw new Error('Sá»‘ lÆ°á»£ng chá»‰ Ä‘Æ°á»£c cÃ³ tá»‘i Ä‘a 3 chá»¯ sá»‘ tháº­p phÃ¢n.')
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (!reason || reason.length > 4000) throw new Error('LÃ½ do Ä‘iá»u chá»‰nh lÃ  báº¯t buá»™c vÃ  tá»‘i Ä‘a 4.000 kÃ½ tá»±.')
  const transactionDate = new Date(body.transactionDate)
  if (typeof body.transactionDate !== 'string' || !body.transactionDate.trim() || Number.isNaN(transactionDate.getTime())) throw new Error('Thá»i Ä‘iá»ƒm Ä‘iá»u chá»‰nh khÃ´ng há»£p lá»‡.')
  return { supplyId: body.supplyId, quantity: body.direction === 'decrease' ? -amount : amount, transactionDate, reason }
}
