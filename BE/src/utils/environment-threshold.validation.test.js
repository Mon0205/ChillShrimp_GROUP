import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyEnvironmentMeasurement,
  normalizeEnvironmentThresholdInput,
  selectApplicableThreshold,
} from './environment-threshold.validation.js'

const valid = {
  species: 'white_leg_shrimp',
  developmentStage: 'PL12-PL20',
  tankType: 'nursery_tank',
  parameterCode: 'ph',
  unit: 'pH',
  optimalMin: 7.5,
  optimalMax: 8.5,
  warningMin: 7,
  warningMax: 9,
  dangerMin: 6,
  dangerMax: 10,
  sourceReference: 'Farm water-quality protocol v1',
  effectiveFrom: '2026-10-01',
  effectiveTo: null,
}

test('normalizes a valid threshold and date-only range', () => {
  const result = normalizeEnvironmentThresholdInput(valid)
  assert.equal(result.parameterCode, 'ph')
  assert.equal(result.effectiveFrom.toISOString(), '2026-10-01T00:00:00.000Z')
  assert.equal(result.effectiveTo, null)
})

test('rejects invalid ranges, missing alert limits, and unsupported selectors', () => {
  assert.throws(() => normalizeEnvironmentThresholdInput({ ...valid, warningMin: 10, warningMax: 9 }), /must not exceed/)
  assert.throws(() => normalizeEnvironmentThresholdInput({ ...valid, warningMin: null, warningMax: null, dangerMin: null, dangerMax: null }), /At least one/)
  assert.throws(() => normalizeEnvironmentThresholdInput({ ...valid, tankType: 'anywhere' }), /Tank type/)
  assert.throws(() => normalizeEnvironmentThresholdInput({ ...valid, effectiveTo: '2026-09-30' }), /on or after/)
})

test('classifies values outside warning and danger boundaries', () => {
  const threshold = normalizeEnvironmentThresholdInput(valid)
  assert.equal(classifyEnvironmentMeasurement(7.8, threshold), null)
  assert.equal(classifyEnvironmentMeasurement(6.5, threshold), 'warning')
  assert.equal(classifyEnvironmentMeasurement(5.9, threshold), 'critical')
  assert.equal(classifyEnvironmentMeasurement(5.9, { ...threshold, warningMin: null, warningMax: null }), 'critical')
})

test('prefers the most specific applicable threshold over wildcard defaults', () => {
  const wildcard = { species: 'all', developmentStage: 'all', tankType: 'all', effectiveFrom: '2026-10-01' }
  const specific = { species: 'white_leg_shrimp', developmentStage: 'PL12-PL20', tankType: 'all', effectiveFrom: '2026-09-01' }
  assert.equal(selectApplicableThreshold([wildcard, specific], {
    species: 'white_leg_shrimp', developmentStage: 'PL12-PL20', tankType: 'nursery_tank',
  }), specific)
})
