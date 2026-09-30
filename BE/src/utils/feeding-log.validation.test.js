import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeFeedingLogInput } from './feeding-log.validation.js'

const validInput = {
  feedName: 'Thức ăn ương PL',
  amount: '2.5',
  unit: 'kg',
  feedingTime: '2026-10-01T08:30:00.000Z',
}

test('normalizes valid feeding log and optional measurements', () => {
  const result = normalizeFeedingLogInput({ ...validInput, biomassSnapshotKg: '24', feedingRatePercent: '8.5', recommendedAmount: '2', feedCheckStatus: 'leftover' })
  assert.equal(result.feedName, 'Thức ăn ương PL')
  assert.equal(result.amount, 2.5)
  assert.equal(result.biomassSnapshotKg, 24)
  assert.equal(result.recommendedAmount, 2)
  assert.equal(result.feedCheckStatus, 'leftover')
})

test('rejects blank feed name, non-positive amount, invalid status, and invalid time', () => {
  assert.throws(() => normalizeFeedingLogInput({ ...validInput, feedName: ' ' }), /Tên thức ăn/)
  assert.throws(() => normalizeFeedingLogInput({ ...validInput, amount: 0 }), /Lượng thức ăn/)
  assert.throws(() => normalizeFeedingLogInput({ ...validInput, amount: '1.0001' }), /3 chữ số thập phân/)
  assert.throws(() => normalizeFeedingLogInput({ ...validInput, feedCheckStatus: 'unknown' }), /Trạng thái/)
  assert.throws(() => normalizeFeedingLogInput({ ...validInput, feedingTime: 'not-a-date' }), /Thời gian/)
})
