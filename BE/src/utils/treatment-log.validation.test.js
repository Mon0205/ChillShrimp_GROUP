import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTreatmentLogInput } from './treatment-log.validation.js'

const valid = {
  tankId: '2874b2ba-1c01-4527-a41a-a37b586170d7',
  productName: 'Probiotic A',
  amount: '12.5',
  unit: 'ml',
  purpose: 'Hỗ trợ xử lý nước',
  performedAt: '2026-10-04T08:30:00.000Z',
  notes: 'Ghi nhận thử nghiệm',
}

test('normalizes valid treatment log and optional stock item', () => {
  const log = normalizeTreatmentLogInput({ ...valid, supplyId: '11111111-1111-4111-8111-111111111111' })
  assert.equal(log.amount, 12.5)
  assert.equal(log.supplyId, '11111111-1111-4111-8111-111111111111')
  assert.ok(log.performedAt instanceof Date)
})

test('accepts optional notes and supply reference', () => {
  const log = normalizeTreatmentLogInput({ ...valid, notes: null })
  assert.equal(log.notes, null)
  assert.equal(log.supplyId, null)
})

test('rejects invalid required values, identifiers, quantity precision and date', () => {
  assert.throws(() => normalizeTreatmentLogInput({ ...valid, tankId: 'bad' }), /Mã ao\/bể/)
  assert.throws(() => normalizeTreatmentLogInput({ ...valid, supplyId: 'bad' }), /Mã vật tư/)
  assert.throws(() => normalizeTreatmentLogInput({ ...valid, productName: ' ' }), /Tên thuốc/)
  assert.throws(() => normalizeTreatmentLogInput({ ...valid, amount: 0 }), /Liều lượng/)
  assert.throws(() => normalizeTreatmentLogInput({ ...valid, amount: 1.2345 }), /3 chữ số/)
  assert.throws(() => normalizeTreatmentLogInput({ ...valid, purpose: '' }), /Mục đích/)
  assert.throws(() => normalizeTreatmentLogInput({ ...valid, performedAt: 'bad' }), /Thời điểm/)
})

test('rejects unsupported fields and overlong text', () => {
  assert.throws(() => normalizeTreatmentLogInput({ ...valid, batchId: 'unused' }), /không được hỗ trợ/)
  assert.throws(() => normalizeTreatmentLogInput({ ...valid, notes: 'x'.repeat(4001) }), /4.000 ký tự/)
  assert.throws(() => normalizeTreatmentLogInput({ ...valid, purpose: 'x'.repeat(4001) }), /4.000 ký tự/)
})
