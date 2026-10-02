import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeWaterChangeLogInput } from './water-change-log.validation.js'

const valid = {
  tankId: '2874b2ba-1c01-4527-a41a-a37b586170d7',
  waterChangePercentage: 25.5,
  performedAt: '2026-10-02T08:30:00.000Z',
  notes: 'Thay nước sau khi kiểm tra đáy bể.',
}

test('normalizes a valid water change log', () => {
  const normalized = normalizeWaterChangeLogInput(valid)
  assert.equal(normalized.waterChangePercentage, 25.5)
  assert.ok(normalized.performedAt instanceof Date)
})

test('allows boundary percentages and optional notes', () => {
  assert.equal(normalizeWaterChangeLogInput({ ...valid, waterChangePercentage: 0, notes: null }).waterChangePercentage, 0)
  assert.equal(normalizeWaterChangeLogInput({ ...valid, waterChangePercentage: 100, notes: '' }).waterChangePercentage, 100)
})

test('rejects invalid tank, out-of-range percentage, excessive precision, and invalid date', () => {
  assert.throws(() => normalizeWaterChangeLogInput({ ...valid, tankId: 'not-a-uuid' }), /Mã ao\/bể/)
  assert.throws(() => normalizeWaterChangeLogInput({ ...valid, waterChangePercentage: 100.01 }), /0 đến 100/)
  assert.throws(() => normalizeWaterChangeLogInput({ ...valid, waterChangePercentage: 1.234 }), /2 chữ số/)
  assert.throws(() => normalizeWaterChangeLogInput({ ...valid, performedAt: 'bad-date' }), /Thời điểm/)
})

test('rejects unsupported input fields and oversized notes', () => {
  assert.throws(() => normalizeWaterChangeLogInput({ ...valid, batchId: 'unused' }), /không được hỗ trợ/)
  assert.throws(() => normalizeWaterChangeLogInput({ ...valid, notes: 'x'.repeat(4001) }), /4.000 ký tự/)
})
