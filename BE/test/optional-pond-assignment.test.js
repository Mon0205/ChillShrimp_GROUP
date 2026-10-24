import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { setPrismaClientForTests, resetPrismaClientForTests } from '../src/config/prisma.js'
import { createPondTank, updatePondTank } from '../src/controllers/pond-tank.controller.js'

afterEach(resetPrismaClientForTests)
const response = () => ({ status(code) { this.code = code; return this }, json(body) { this.body = body; return this } })
const request = (body = {}) => ({ params: { farmId: 'farm', tankId: 'tank' }, membership: { role: 'owner' }, body: { code: 'AO01', name: 'Ao 1', volumeM3: 10, areaId: 'area', ...body } })
function setup({ assigned = 'tech', count = 0, member = { userId: 'tech' } } = {}) {
  const writes = []
  let checks = 0
  const client = {
    $queryRaw: async () => [],
    area: { findFirst: async () => ({ id: 'area' }) },
    farmMember: { findFirst: async () => { checks++; return member } },
    pondTank: {
      findFirst: async () => ({ id: 'tank', areaId: 'area', responsibleUserId: assigned, status: 'empty' }),
      count: async () => count,
      create: async ({ data }) => { writes.push(data); return data },
      update: async ({ data }) => { writes.push(data); return { volumeM3: 10, ...data } },
    },
    $transaction: async fn => fn(client),
  }
  setPrismaClientForTests(client)
  return { writes, get checks() { return checks } }
}

test('create a tank without assigning an employee', async () => {
  for (const value of [undefined, null, '', '  ']) {
    const state = setup()
    await createPondTank(request({ responsibleUserId: value }), response())
    assert.equal(state.writes[0].responsibleUserId, null)
    assert.equal(state.checks, 0)
  }
})
test('clear an existing assignment on edit', async () => {
  for (const value of [null, '']) {
    const state = setup()
    await updatePondTank(request({ responsibleUserId: value }), response())
    assert.equal(state.writes[0].responsibleUserId, null)
  }
})
test('editing unrelated fields preserves an existing assignment', async () => {
  const state = setup()
  await updatePondTank(request({ name: 'Ao moi' }), response())
  assert.equal('responsibleUserId' in state.writes[0], false)
})
test('an unassigned tank can move to another area', async () => {
  const state = setup({ assigned: null })
  await updatePondTank(request({ areaId: 'other' }), response())
  assert.equal(state.writes[0].responsibleUserId, null)
  assert.equal(state.writes[0].areaId, 'other')
})
test('assigned employees must still be active technicians in the target area', async () => {
  setup({ member: null })
  await assert.rejects(createPondTank(request({ responsibleUserId: 'wrong' }), response()), { status: 400 })
})
test('the five-tank limit still applies when choosing an employee', async () => {
  setup({ count: 5 })
  await assert.rejects(createPondTank(request({ responsibleUserId: 'tech' }), response()), { status: 409 })
})
test('non-string assignment IDs are rejected', async () => {
  setup()
  await assert.rejects(createPondTank(request({ responsibleUserId: {} }), response()), { status: 400 })
})
