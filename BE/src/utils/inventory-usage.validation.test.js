import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeInventoryUsageInput } from './inventory-usage.validation.js'

const valid = {
  supplyId: '9cbe76d4-3280-4f7c-b197-c54066daf410',
  batchId: '2874b2ba-1c01-4527-a41a-a37b586170d7',
  quantity: '1.25',
  transactionDate: '2026-10-02T08:30:00.000Z',
  notes: 'Sử dụng cho ao ương.',
}

test('normalizes a valid inventory usage transaction', () => {
  const result = normalizeInventoryUsageInput(valid)
  assert.equal(result.quantity, 1.25)
  assert.equal(result.batchId, valid.batchId)
  assert.ok(result.transactionDate instanceof Date)
})

test('allows usage without a batch for farm-wide records', () => {
  assert.equal(normalizeInventoryUsageInput({ ...valid, batchId: null }).batchId, null)
})

test('rejects invalid IDs, nonpositive quantity, excessive precision, and invalid date', () => {
  assert.throws(() => normalizeInventoryUsageInput({ ...valid, supplyId: 'bad' }), /Mã vật tư/)
  assert.throws(() => normalizeInventoryUsageInput({ ...valid, batchId: 'bad' }), /Mã lô/)
  assert.throws(() => normalizeInventoryUsageInput({ ...valid, quantity: 0 }), /lớn hơn 0/)
  assert.throws(() => normalizeInventoryUsageInput({ ...valid, quantity: 1.0001 }), /3 chữ số/)
  assert.throws(() => normalizeInventoryUsageInput({ ...valid, transactionDate: 'bad' }), /Thời điểm/)
})

test('rejects unsupported data and oversized notes', () => {
  assert.throws(() => normalizeInventoryUsageInput({ ...valid, tankId: 'not-supported' }), /không được hỗ trợ/)
  assert.throws(() => normalizeInventoryUsageInput({ ...valid, notes: 'x'.repeat(4001) }), /4.000 ký tự/)
})
