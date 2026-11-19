import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { resetPrismaClientForTests, setPrismaClientForTests } from '../src/config/prisma.js'
import { analyzeAiInspection, STALE_PROCESSING_MS } from '../src/services/seed/ai-inspection.service.js'

const FARM = '11111111-1111-4111-8111-111111111111'
const BATCH = '22222222-2222-4222-8222-222222222222'
const STALE = '33333333-3333-4333-8333-333333333331'
const FRESH = '33333333-3333-4333-8333-333333333332'

function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some((branch) => matches(row, branch))
    if (value && typeof value === 'object' && 'in' in value) return value.in.includes(row[key])
    if (value && typeof value === 'object' && 'lt' in value) return row[key] < value.lt
    return row[key] === value
  })
}

// In-memory stand-in for the Prisma calls analyzeAiInspection makes before it reaches Cloudinary.
function fakePrisma() {
  const now = Date.now()
  const rows = [
    { id: STALE, batchId: BATCH, status: 'processing', createdAt: new Date(now - STALE_PROCESSING_MS - 60000), mediaUrl: 'https://res.cloudinary.com/x/stale.jpg' },
    { id: FRESH, batchId: BATCH, status: 'processing', createdAt: new Date(now - 60000), mediaUrl: 'https://res.cloudinary.com/x/fresh.jpg' },
  ]
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
      update: async ({ where, data }) => Object.assign(rows.find((row) => row.id === where.id), data),
    },
  }
}

const context = { farmId: FARM, batchId: BATCH, actor: { id: 'tech-1' }, membership: { role: 'OWNER', areaId: null } }

afterEach(() => resetPrismaClientForTests())

test('an inspection stuck in processing for over 10 minutes can be analysed again', async (t) => {
  const db = fakePrisma()
  setPrismaClientForTests(db)
  t.mock.method(console, 'error', () => {})
  // Stop the run right after the claim: the image download fails, so the row ends up failed (not stuck).
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('offline in tests') })
  await assert.rejects(analyzeAiInspection({ ...context, inspectionId: STALE }), { status: 502 })
  assert.equal(db.rows.find((row) => row.id === STALE).status, 'failed')
})

test('a recent processing inspection is still protected from a second analysis', async () => {
  const db = fakePrisma()
  setPrismaClientForTests(db)
  await assert.rejects(analyzeAiInspection({ ...context, inspectionId: FRESH }), { status: 409 })
  assert.equal(db.rows.find((row) => row.id === FRESH).status, 'processing')
})
