import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveGrowthMetrics, getQuantityDelta } from './seed-batch-metrics.js'

test('quantity events produce signed deltas', () => {
  assert.equal(getQuantityDelta('mortality', 12), -12)
  assert.equal(getQuantityDelta('transfer_in', 12), 12)
  assert.equal(getQuantityDelta('adjustment', 3, 'increase'), 3)
  assert.equal(getQuantityDelta('adjustment', 3, 'decrease'), -3)
})

test('adjustment delta requires an explicit direction', () => {
  assert.throws(() => getQuantityDelta('adjustment', 2), RangeError)
})

test('growth metrics derive mean weight and biomass when omitted', () => {
  assert.deepEqual(deriveGrowthMetrics({ sampleCount: 20, totalSampleWeightG: 50, averageWeightG: null, estimatedQuantity: 1000, biomassKg: null }), {
    averageWeightG: 2.5,
    biomassKg: 2.5,
  })
})

test('explicit growth metrics are preserved', () => {
  assert.deepEqual(deriveGrowthMetrics({ sampleCount: 10, totalSampleWeightG: 20, averageWeightG: 3, estimatedQuantity: 100, biomassKg: 0.4 }), {
    averageWeightG: 3,
    biomassKg: 0.4,
  })
})
