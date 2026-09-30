import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeInventorySupplyInput } from './inventory-supply.validation.js'

const valid = { name: 'Thức ăn PL', category: 'feed', unit: 'kg', unitPrice: 42.5, minThreshold: 10 }

test('normalizes a complete supply catalog item', () => {
  assert.deepEqual(normalizeInventorySupplyInput(valid), { ...valid })
})

test('allows partial edits but rejects invalid categories and stock edits', () => {
  assert.deepEqual(normalizeInventorySupplyInput({ unitPrice: '0' }, { partial: true }), { unitPrice: 0 })
  assert.throws(() => normalizeInventorySupplyInput({ ...valid, category: 'unknown' }), /Loại vật tư/)
  assert.throws(() => normalizeInventorySupplyInput({ quantity: 20 }, { partial: true }), /Không thể sửa tồn kho/)
})

test('rejects negative values and excessive decimal precision', () => {
  assert.throws(() => normalizeInventorySupplyInput({ ...valid, unitPrice: -1 }), /Đơn giá/)
  assert.throws(() => normalizeInventorySupplyInput({ ...valid, minThreshold: 0.0001 }), /3 chữ số thập phân/)
})
