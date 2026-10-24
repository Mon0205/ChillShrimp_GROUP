import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
process.env.NEON_AUTH_URL ||= 'https://auth.example.test/auth'
process.env.NEON_AUTH_COOKIE_SECRET ||= 'test-secret-with-at-least-32-characters'
const middleware = await import('../src/middlewares/auth.middleware.js')
const { accountAccess } = await import('../src/auth/access.js')
const { listFarms } = await import('../src/controllers/farm.controller.js')
const { listAreas } = await import('../src/controllers/area.controller.js')
const { updateManagedUser } = await import('../src/users/patch.js')
const { createInvitation } = await import('../src/users/post.js')
const { revokeInvitation } = await import('../src/users/delete.js')
const { setPrismaClientForTests, resetPrismaClientForTests } = await import('../src/config/prisma.js')
const auth = { id: 'manager', email: 'farm-manager@example.test' }
const membership = { userId: auth.id, farmId: 'farm-a', role: 'farm_manager', areaId: null, status: 'active', farm: { status: 'active' } }
const response = () => ({ status(code) { this.code = code; return this }, json(body) { this.body = body; return this }, end() {} })
const check = (name, req) => new Promise(resolve => middleware[name](req, {}, resolve))
afterEach(resetPrismaClientForTests)
function scopedClient(member = membership) {
  setPrismaClientForTests({ farmMember: { findUnique: async ({where}) => where.farmId_userId.farmId === 'farm-a' ? member : null, findMany: async () => [member] } })
}
test('farm manager passes every farm-wide gate in the assigned farm', async () => {
  scopedClient()
  const gates = ['requireFarmMember','requireFarmManager','requireFarmOwner','requireFarmOwnerIncludingArchived','requirePondTankViewer','requirePondTankManager','requireSeedSupplierViewer','requireSeedSupplierManager','requireSeedBatchViewer','requireSeedBatchManager','requireFeedingAccess','requireCareLogAccess','requireEnvironmentThresholdViewer','requireEnvironmentThresholdManager','requireInventorySupplyViewer','requireInventorySupplyManager','requireInventoryUsageAccess','requireInventoryRequestAccess','requireInventoryAdjustmentManager']
  for (const gate of gates) {
    const req = { auth, params: { farmId: 'farm-a' } }
    assert.equal(await check(gate, req), undefined, gate)
    assert.equal(req.membership.role, 'farm_manager')
  }
})
test('farm manager cannot access another farm or create farms', async () => {
  scopedClient()
  assert.equal((await check('requireFarmManager', { auth, params: { farmId: 'farm-b' } })).status, 403)
  assert.deepEqual(await accountAccess(auth), { isSystemAdmin: false, canCreateFarm: false })
  assert.equal((await check('requireOwnerAccount', { auth })).status, 403)
})
test('suspension and inactive farm protections apply to farm managers', async () => {
  scopedClient({ ...membership, status: 'suspended' })
  assert.equal((await check('requireFarmOwner', { auth, params: { farmId: 'farm-a' } })).status, 403)
  scopedClient({ ...membership, farm: { status: 'inactive' } })
  assert.equal((await check('requireFarmOwner', { auth, params: { farmId: 'farm-a' } })).status, 409)
  assert.equal(await check('requireFarmOwnerIncludingArchived', { auth, params: { farmId: 'farm-a' } }), undefined)
})
test('farm listing retains farm_manager role and returns all areas in its farm', async () => {
  setPrismaClientForTests({ farmMember: { findMany: async ({where}) => {
    assert.equal(where.userId, auth.id)
    assert.ok(where.role.in.includes('farm_manager'))
    return [{ ...membership, farm: { id: 'farm-a' }, area: null }]
  } }, area: { findMany: async ({where}) => { assert.ok(where.OR[0].farmId.in.includes('farm-a')); return [{ id: 'a1', farmId: 'farm-a' },{ id: 'a2', farmId: 'farm-a' }] } } })
  const res = response()
  await listFarms({ auth, query: { manageable: 'true' } }, res)
  assert.equal(res.body.data[0].role, 'farm_manager')
  assert.equal(res.body.data[0].areas.length, 2)
})
test('farm manager can list inactive areas without area scoping', async () => {
  setPrismaClientForTests({ area: { findMany: async ({where}) => { assert.deepEqual(where, { farmId: 'farm-a' }); return [] } } })
  await listAreas({ membership, params: { farmId: 'farm-a' }, query: { includeInactive: 'true' } }, response())
})
test('new role can be assigned to a user and clears any previous area assignment', async () => {
  let write
  setPrismaClientForTests({
    farmMember: { findUnique: async () => ({ userId: 'staff', role: 'technician', areaId: 'a1', user: { id: 'staff', email: 'staff@example.test' } }), update: async ({data}) => { write = data; return { ...data, user: { id: 'staff' }, area: null } } },
    user: { update: async () => ({}) }, $transaction: async promises => Promise.all(promises),
  })
  await updateManagedUser({ auth, membership, params: { userId: 'staff' }, body: { farmId: 'farm-a', role: 'farm_manager', areaId: 'old-area', displayName: 'Manager', status: 'active' } }, response())
  assert.equal(write.role, 'farm_manager')
  assert.equal(write.areaId, null)
})
test('owner may invite the new role without an area, area manager cannot', async () => {
  // Existing-email conflict proves role/area validation passed, without sending email.
  setPrismaClientForTests({ user: { findUnique: async () => ({ id: 'existing' }) }, farmInvitation: { findFirst: async () => null }, farm: { findUnique: async () => ({ id: 'farm-a' }) } })
  const req = { auth, membership: { role: 'owner' }, body: { farmId: 'farm-a', email: 'new@example.test', role: 'farm_manager' } }
  await assert.rejects(createInvitation(req, response()), { status: 409 })
  await assert.rejects(createInvitation({ ...req, membership: { role: 'area_manager', areaId: 'a1' } }, response()), { status: 403 })
})
test('farm manager can revoke invitations in assigned farm only', async () => {
  let targetFarm = 'farm-a', writes = 0
  setPrismaClientForTests({ farmInvitation: { findUnique: async () => ({ id: 'invite', status: 'pending', farmId: targetFarm }), update: async () => { writes++ } }, farmMember: { findUnique: async ({where}) => where.farmId_userId.farmId === 'farm-a' ? membership : null } })
  const req = { auth, params: { invitationId: 'invite' } }
  await revokeInvitation(req, response())
  targetFarm = 'farm-b'
  await assert.rejects(revokeInvitation(req, response()), { status: 403 })
  assert.equal(writes, 1)
})
test('farm managers cannot invite or promote an account to owner to escape farm scope', async () => {
  const req = { auth, membership, params: { userId: 'staff' }, body: { farmId: 'farm-a', email: 'new@example.test', role: 'owner', displayName: 'Staff', status: 'active' } }
  setPrismaClientForTests({ farmMember: { findUnique: async () => ({ userId: 'staff', role: 'technician', areaId: 'a1', user: { id: 'staff' } }) } })
  await assert.rejects(createInvitation(req, response()), { status: 403 })
  await assert.rejects(updateManagedUser(req, response()), { status: 403 })
})
test('care logs query every area but retain the assigned farm filter', async () => {
  const { listFeedingLogs } = await import('../src/controllers/feeding-log.controller.js')
  const validate = ({where}) => assert.deepEqual(where.tank.is, { farmId: 'farm-a', deletedAt: null })
  setPrismaClientForTests({ feedingLog: {
    findMany: async query => { validate(query); return [] },
    count: async query => { validate(query); return 0 },
    groupBy: async query => { validate(query); return [] },
  }, $transaction: async promises => Promise.all(promises) })
  await listFeedingLogs({ membership, params: { farmId: 'farm-a' }, query: {} }, response())
})
