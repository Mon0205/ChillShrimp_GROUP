import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { resetPrismaClientForTests, setPrismaClientForTests } from '../src/config/prisma.js'
import { deleteAiInspection, recoverInterruptedAiInspections } from '../src/services/seed/ai-inspection.service.js'

const FARM = '11111111-1111-4111-8111-111111111111'
const BATCH = '22222222-2222-4222-8222-222222222222'
const ids = {
  processing: '33333333-3333-4333-8333-333333333331',
  completed: '33333333-3333-4333-8333-333333333332',
  pending: '33333333-3333-4333-8333-333333333333',
}

// In-memory stand-in for the few Prisma calls these service functions make.
function fakePrisma() {
  const rows = [
    { id: ids.processing, batchId: BATCH, status: 'processing', createdBy: 'tech-1', mediaPublicId: 'p1' },
    { id: ids.completed, batchId: BATCH, status: 'completed', createdBy: 'tech-1', mediaPublicId: 'p2' },
    { id: ids.pending, batchId: BATCH, status: 'pending', createdBy: 'tech-1', mediaPublicId: 'p3' },
  ]
  const matches = (row, where) => Object.entries(where).every(([key, value]) =>
    value && typeof value === 'object' && 'in' in value ? value.in.includes(row[key]) : row[key] === value)
  return {
    rows,
    seedBatch: { findFirst: async ({ where }) => (where.id === BATCH ? { id: BATCH, batchCode: 'B1', tank: { id: 't', name: 'T', code: 'T' } } : null) },
    aiInspection: {
      findFirst: async ({ where }) => rows.find((row) => matches(row, where)) || null,
      updateMany: async ({ where, data }) => {
        const hit = rows.filter((row) => matches(row, where))
        hit.forEach((row) => Object.assign(row, data))
        return { count: hit.length }
      },
      deleteMany: async ({ where }) => {
        const hit = rows.filter((row) => matches(row, where))
        hit.forEach((row) => rows.splice(rows.indexOf(row), 1))
        return { count: hit.length }
      },
    },
  }
}

const technician = { farmId: FARM, batchId: BATCH, actor: { id: 'tech-1' }, membership: { role: 'TECHNICIAN', areaId: 'area-1' } }

afterEach(() => resetPrismaClientForTests())

test('startup recovery moves only interrupted (processing) inspections to failed', async () => {
  const db = fakePrisma()
  setPrismaClientForTests(db)
  assert.equal(await recoverInterruptedAiInspections(), 1)
  assert.deepEqual(db.rows.map((row) => row.status), ['failed', 'completed', 'pending'])
  assert.equal(await recoverInterruptedAiInspections(), 0)
})

test('an inspection stuck in processing cannot be deleted until recovery, then it can', async (t) => {
  const db = fakePrisma()
  setPrismaClientForTests(db)
  // Cloudinary is not configured in tests; the service logs that cleanup failure and still deletes the row.
  t.mock.method(console, 'error', () => {})
  await assert.rejects(deleteAiInspection({ ...technician, inspectionId: ids.processing }), { status: 409 })
  await recoverInterruptedAiInspections()
  assert.deepEqual(await deleteAiInspection({ ...technician, inspectionId: ids.processing }), { id: ids.processing })
  assert.equal(db.rows.some((row) => row.id === ids.processing), false)
})
