import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeInventoryImportInput } from './inventory-import.validation.js'

const valid = {
  supplyId: '9cbe76d4-3280-4f7c-b197-c54066daf410',
  quantity: '12.5',
  unitPrice: '180000.25',
  transactionDate: '2026-10-04T08:30:00.000Z',
  notes: 'Invoice 1001',
}

test('normalizes a valid stock import transaction', () => {
  const result = normalizeInventoryImportInput(valid)
  assert.equal(result.quantity, 12.5)
  assert.equal(result.unitPrice, 180000.25)
  assert.ok(result.transactionDate instanceof Date)
})

test('rejects malformed supply IDs, nonpositive quantity, negative price, and excessive precision', () => {
  assert.throws(() => normalizeInventoryImportInput({ ...valid, supplyId: 'bad' }), /Supply id/)
  assert.throws(() => normalizeInventoryImportInput({ ...valid, quantity: 0 }), /Quantity/)
  assert.throws(() => normalizeInventoryImportInput({ ...valid, unitPrice: -1 }), /Unit price/)
  assert.throws(() => normalizeInventoryImportInput({ ...valid, quantity: 1.0001 }), /decimal places/)
  assert.throws(() => normalizeInventoryImportInput({ ...valid, unitPrice: 1.001 }), /decimal places/)
})

test('rejects invalid dates, unknown fields, and oversized notes', () => {
  assert.throws(() => normalizeInventoryImportInput({ ...valid, transactionDate: 'bad' }), /Transaction date/)
  assert.throws(() => normalizeInventoryImportInput({ ...valid, batchId: 'unsupported' }), /not supported/)
  assert.throws(() => normalizeInventoryImportInput({ ...valid, notes: 'x'.repeat(4001) }), /4000 characters/)
})
