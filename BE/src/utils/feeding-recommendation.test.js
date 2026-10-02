import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateRecommendedFeed } from './feeding-recommendation.js'

const batch = { currentEstimatedQuantity: 125000 }

test('calculates the biomass-based midpoint recommendation in kilograms', () => {
  const result = calculateRecommendedFeed({
    guideline: { feedingRateMinPercent: 3, feedingRateMaxPercent: 5, feedPer1000SeedG: 2, mealsPerDay: 5, sourceReference: 'farm SOP', adjustmentNotes: null },
    batch,
    biomassSnapshotKg: 20,
  })
  assert.equal(result.amount, 0.8)
  assert.equal(result.unit, 'kg')
  assert.equal(result.ratePercent, 4)
})

test('falls back to the per-thousand-seed guideline when biomass is unavailable', () => {
  const result = calculateRecommendedFeed({
    guideline: { feedingRateMinPercent: null, feedingRateMaxPercent: null, feedPer1000SeedG: 2, mealsPerDay: null, sourceReference: 'farm SOP', adjustmentNotes: null },
    batch,
  })
  assert.equal(result.amount, 250)
  assert.equal(result.unit, 'g')
})

test('returns no recommendation when required guideline inputs are absent', () => {
  assert.equal(calculateRecommendedFeed({ guideline: null, batch }), null)
  assert.equal(calculateRecommendedFeed({ guideline: { feedingRateMinPercent: 3, feedingRateMaxPercent: 4, feedPer1000SeedG: null }, batch }), null)
})
