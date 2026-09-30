export function getQuantityDelta(eventType, quantity, adjustmentDirection = null) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new RangeError('Quantity must be a positive integer.')
  if (eventType === 'mortality' || eventType === 'sale' || eventType === 'transfer_out') return -quantity
  if (eventType === 'stocking' || eventType === 'transfer_in') return quantity
  if (eventType === 'adjustment' && adjustmentDirection === 'increase') return quantity
  if (eventType === 'adjustment' && adjustmentDirection === 'decrease') return -quantity
  throw new RangeError('Unsupported quantity event or adjustment direction.')
}

export function deriveGrowthMetrics({ sampleCount, totalSampleWeightG, averageWeightG, estimatedQuantity, biomassKg }) {
  const average = averageWeightG ?? (totalSampleWeightG === null ? null : totalSampleWeightG / sampleCount)
  const biomass = biomassKg ?? (average === null || estimatedQuantity === null ? null : average * estimatedQuantity / 1000)
  return { averageWeightG: average, biomassKg: biomass }
}
