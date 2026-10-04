import test from 'node:test'
import assert from 'node:assert/strict'
import { createEnvironmentAlerts } from './environment-threshold.service.js'

const tank = { id: 'tank-1', code: 'T-01', name: 'Nursery 1', tankType: 'nursery_tank' }
const log = {
  id: 'log-1',
  recordedAt: new Date('2026-10-04T08:00:00.000Z'),
  temperature: 30,
  ph: null,
  salinity: null,
  dissolvedOxygen: null,
  nh3: null,
  tan: null,
  no2: null,
  nitrate: null,
  alkalinity: null,
  h2s: null,
  turbidity: null,
  waterLevelM: null,
}
const threshold = {
  id: 'threshold-1', parameterCode: 'temperature', species: 'white_leg_shrimp',
  developmentStage: 'PL12', tankType: 'nursery_tank', unit: '°C',
  warningMin: 25, warningMax: 29, dangerMin: 22, dangerMax: 33,
  effectiveFrom: new Date('2026-10-01T00:00:00.000Z'), updatedAt: new Date('2026-10-01T00:00:00.000Z'),
}

function transactionWithThresholds(thresholds) {
  const created = []
  return {
    created,
    tx: {
      seedBatch: { findFirst: async () => ({ id: 'batch-1', species: 'white_leg_shrimp', developmentStage: 'PL12' }) },
      environmentThreshold: { findMany: async () => thresholds },
      alertNotification: {
        createMany: async ({ data }) => { created.push(...data) },
        findMany: async () => created,
      },
    },
  }
}

test('creates a warning alert when a measured value exceeds the approved rule range', async () => {
  const { tx, created } = transactionWithThresholds([threshold])
  const alerts = await createEnvironmentAlerts(tx, { farmId: 'farm-1', tank, log })

  assert.equal(created.length, 1)
  assert.equal(alerts[0].severity, 'warning')
  assert.equal(alerts[0].tankId, tank.id)
  assert.equal(alerts[0].batchId, 'batch-1')
  assert.equal(alerts[0].sourceLogId, log.id)
})

test('does not create an alert when the applicable thresholds are not exceeded', async () => {
  const { tx, created } = transactionWithThresholds([threshold])
  const alerts = await createEnvironmentAlerts(tx, {
    farmId: 'farm-1', tank, log: { ...log, temperature: 27 },
  })

  assert.deepEqual(alerts, [])
  assert.deepEqual(created, [])
})

test('does not apply a rule for another species', async () => {
  const { tx, created } = transactionWithThresholds([{ ...threshold, species: 'black_tiger_shrimp' }])
  const alerts = await createEnvironmentAlerts(tx, { farmId: 'farm-1', tank, log })

  assert.deepEqual(alerts, [])
  assert.deepEqual(created, [])
})
