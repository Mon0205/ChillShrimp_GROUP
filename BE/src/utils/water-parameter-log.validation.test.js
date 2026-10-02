import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeWaterParameterLogInput } from './water-parameter-log.validation.js'

const valid = {
  tankId: '2874b2ba-1c01-4527-a41a-a37b586170d7',
  temperature: '28.5',
  ph: 7.8,
  salinity: null,
  measurementMethod: 'manual',
  recordedAt: '2026-10-02T08:30:00.000Z',
}

test('normalizes measured values and keeps unmeasured values null', () => {
  const result = normalizeWaterParameterLogInput(valid)
  assert.equal(result.temperature, 28.5)
  assert.equal(result.salinity, null)
  assert.ok(result.recordedAt instanceof Date)
})

test('allows zero measurements but requires at least one measured parameter', () => {
  assert.equal(normalizeWaterParameterLogInput({ ...valid, ph: 0, temperature: null }).ph, 0)
  assert.equal(normalizeWaterParameterLogInput({ ...valid, temperature: -1, ph: null }).temperature, -1)
  assert.throws(() => normalizeWaterParameterLogInput({ ...valid, ph: null, temperature: null }), /ít nhất một thông số/)
})

test('validates ranges, precision, method and timestamp', () => {
  assert.throws(() => normalizeWaterParameterLogInput({ ...valid, ph: 14.1 }), /pH/)
  assert.throws(() => normalizeWaterParameterLogInput({ ...valid, dissolvedOxygen: -0.1 }), /phải từ 0/)
  assert.throws(() => normalizeWaterParameterLogInput({ ...valid, temperature: 28.1234 }), /3 chữ số/)
  assert.throws(() => normalizeWaterParameterLogInput({ ...valid, measurementMethod: 'sensor' }), /Phương pháp/)
  assert.throws(() => normalizeWaterParameterLogInput({ ...valid, recordedAt: 'invalid' }), /Thời điểm đo/)
})

test('rejects unsupported batch linkage and oversized metadata', () => {
  assert.throws(() => normalizeWaterParameterLogInput({ ...valid, batchId: 'unused' }), /không được hỗ trợ/)
  assert.throws(() => normalizeWaterParameterLogInput({ ...valid, measurementDevice: 'x'.repeat(101) }), /100 ký tự/)
  assert.throws(() => normalizeWaterParameterLogInput({ ...valid, notes: 'x'.repeat(4001) }), /4.000 ký tự/)
})
