import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
process.env.NEON_AUTH_URL = 'https://auth.example.test/auth'
process.env.NEON_AUTH_COOKIE_SECRET = 'test-secret-with-at-least-32-characters'
const { accountAccess } = await import('../src/auth/access.js')
const { requireFarmManager } = await import('../src/middlewares/auth.middleware.js')
const { listFarms } = await import('../src/controllers/farm.controller.js')
const { revokeInvitation } = await import('../src/users/delete.js')
const { setPrismaClientForTests, resetPrismaClientForTests } = await import('../src/config/prisma.js')
const previousEmail = process.env.ADMIN_EMAIL
const admin = { id: 'admin', email: 'ADMIN@example.test' }
const normal = { id: 'normal', email: 'other@example.test' }
function setup(client) { process.env.ADMIN_EMAIL = 'admin@example.test'; setPrismaClientForTests(client) }
afterEach(() => { resetPrismaClientForTests(); if (previousEmail === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = previousEmail })
const response = () => ({ status() { return this }, json(body) { this.body = body; return this }, end() {} })
const access = req => new Promise(resolve => requireFarmManager(req, {}, resolve))
test('configured administrator remains global even with suspended farm memberships', async () => {
  setup({ farmMember: { findMany: async () => [{ role: 'owner', status: 'suspended' }] } })
  assert.deepEqual(await accountAccess(admin), { isSystemAdmin: true, canCreateFarm: true })
  await assert.rejects(accountAccess(normal), { status: 403 })
})
test('ordinary owners do not become system administrators', async () => {
  setup({ farmMember: { findMany: async () => [{ role: 'owner', status: 'active' }] } })
  assert.deepEqual(await accountAccess(normal), { isSystemAdmin: false, canCreateFarm: true })
})
test('administrator can manage a farm without an assigned membership', async () => {
  setup({ farm: { findUnique: async () => ({ status: 'active' }) }, farmMember: { findUnique: async () => null } })
  const req = { auth: admin, query: { farmId: 'other-farm' } }
  assert.equal(await access(req), undefined)
  assert.equal(req.membership.role, 'owner')
  assert.equal(req.membership.farmId, 'other-farm')
  assert.equal((await access({ auth: normal, query: req.query, body: { isSystemAdmin: true } })).status, 403)
})
test('administrator still observes farm existence, lifecycle and consistent IDs', async () => {
  setup({ farm: { findUnique: async () => null } })
  assert.equal((await access({ auth: admin, query: { farmId: 'missing' } })).status, 404)
  setup({ farm: { findUnique: async () => ({ status: 'inactive' }) } })
  assert.equal((await access({ auth: admin, query: { farmId: 'inactive' } })).status, 409)
  assert.equal((await access({ auth: admin, query: { farmId: 'a' }, body: { farmId: 'b' } })).status, 400)
})
test('administrator sees all active farms rather than membership farms', async () => {
  setup({ farm: { findMany: async ({ where }) => { assert.deepEqual(where.status.in, ['active']); return [{ id: 'a' }, { id: 'b' }] } }, area: { findMany: async () => [{ id: 'area-b', farmId: 'b' }] } })
  const res = response()
  await listFarms({ auth: admin, query: {} }, res)
  assert.deepEqual(res.body.data.map(f => f.id), ['a', 'b'])
  assert.equal(res.body.data[1].role, 'owner')
  assert.equal(res.body.data[1].areas[0].id, 'area-b')
})
test('ordinary farm lists remain scoped to authenticated user', async () => {
  setup({ farmMember: { findMany: async ({ where }) => { assert.equal(where.userId, normal.id); return [] } } })
  const res = response()
  await listFarms({ auth: normal, query: {} }, res)
  assert.deepEqual(res.body.data, [])
})
test('administrator may revoke a pending invitation in another farm', async () => {
  let cancelled = false
  setup({ farmInvitation: { findUnique: async () => ({ id: 'invite', farmId: 'b', status: 'pending' }), update: async () => { cancelled = true } }, farmMember: { findUnique: async () => null } })
  await revokeInvitation({ auth: admin, params: { invitationId: 'invite' } }, response())
  assert.equal(cancelled, true)
})
