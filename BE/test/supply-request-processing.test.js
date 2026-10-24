import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { Prisma } from '@prisma/client'
import { setPrismaClientForTests, resetPrismaClientForTests } from '../src/config/prisma.js'
import * as controller from '../src/controllers/inventory-request.controller.js'

afterEach(resetPrismaClientForTests)
const requestId = '11111111-1111-4111-8111-111111111111'
const response = () => ({ status() { return this }, json(body) { this.body = body; return this } })
const request = (role = 'warehouse_staff', body = { reason: 'Không phù hợp' }) => ({ params: { farmId: 'farm', requestId }, auth: { id: 'processor' }, membership: { role }, body })
function setup({ status = 'pending', found = true } = {}) {
  const state = { status, stock: 10, history: [], updates: [] }
  let queue = Promise.resolve()
  const client = {
    $queryRaw: async () => [],
    inventorySupplyRequest: {
      findFirst: async ({ where }) => { assert.equal(where.farmId, 'farm'); return found ? { id: requestId, farmId: 'farm', status: state.status, supplyId: 'supply', areaId: 'area', tankId: 'tank', quantity: new Prisma.Decimal(2) } : null },
      update: async ({ data }) => { state.status = data.status; state.updates.push(data); return { id: requestId, quantity: new Prisma.Decimal(2), ...data } },
    },
    pondTank: { findFirst: async () => ({ id: 'tank' }) },
    inventorySupply: {
      findFirst: async () => ({ id: 'supply', quantity: new Prisma.Decimal(state.stock), unitPrice: new Prisma.Decimal(10) }),
      updateMany: async () => { state.stock -= 2; return { count: 1 } },
    },
    inventoryTransaction: { create: async ({ data }) => { state.history.push(data); return data } },
    async $transaction(fn) {
      const previous = queue
      let release
      queue = new Promise(resolve => { release = resolve })
      await previous
      try { return await fn(client) } finally { release() }
    },
  }
  setPrismaClientForTests(client)
  return state
}

test('warehouse rejects with a reason and records the processor without touching stock/history', async () => {
  const state = setup()
  const res = response()
  await controller.rejectInventorySupplyRequest(request(), res)
  assert.equal(state.status, 'rejected')
  assert.equal(state.stock, 10)
  assert.equal(state.history.length, 0)
  assert.equal(state.updates[0].rejectionReason, 'Không phù hợp')
  assert.equal(state.updates[0].processedBy, 'processor')
  assert.ok(state.updates[0].processedAt instanceof Date)
})
test('owner can also reject requests', async () => {
  const state = setup()
  await controller.rejectInventorySupplyRequest(request('owner'), response())
  assert.equal(state.status, 'rejected')
})
test('area manager and technician cannot process requests', async () => {
  for (const role of ['area_manager', 'technician']) {
    setup()
    await assert.rejects(controller.rejectInventorySupplyRequest(request(role), response()), { status: 403 })
  }
})
test('rejection requires a nonempty reason of at most 4000 characters', async () => {
  for (const reason of [undefined, null, '', '   ', 123, 'x'.repeat(4001)]) {
    const state = setup()
    await assert.rejects(controller.rejectInventorySupplyRequest(request('warehouse_staff', { reason }), response()), { status: 400 })
    assert.equal(state.status, 'pending')
  }
})
test('another farm request cannot be rejected', async () => {
  setup({ found: false })
  await assert.rejects(controller.rejectInventorySupplyRequest(request(), response()), { status: 404 })
})
test('processed requests cannot be rejected again', async () => {
  for (const status of ['fulfilled', 'rejected', 'cancelled']) {
    const state = setup({ status })
    await assert.rejects(controller.rejectInventorySupplyRequest(request(), response()), { status: 409 })
    assert.equal(state.updates.length, 0)
  }
})
test('approval and rejection racing can only process a request once', async () => {
  const state = setup()
  const outcomes = await Promise.allSettled([
    controller.approveInventorySupplyRequest(request(), response()),
    controller.rejectInventorySupplyRequest(request(), response()),
  ])
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(state.updates.length, 1)
  assert.equal(state.stock, state.status === 'fulfilled' ? 8 : 10)
  assert.equal(state.history.length, state.status === 'fulfilled' ? 1 : 0)
})
test('approval records who processed the request and when', async () => {
  const state = setup()
  await controller.approveInventorySupplyRequest(request(), response())
  assert.equal(state.updates[0].processedBy, 'processor')
  assert.ok(state.updates[0].processedAt instanceof Date)
})
test('only area managers create supply requests', async () => {
  for (const role of ['owner', 'warehouse_staff', 'technician']) {
    setup()
    await assert.rejects(controller.createInventorySupplyRequest(request(role, {}), response()), { status: 403 })
  }
})

test('farm manager can approve and reject within the assigned farm', async () => {
  let state = setup()
  await controller.approveInventorySupplyRequest(request('farm_manager'), response())
  assert.equal(state.status, 'fulfilled')
  assert.equal(state.stock, 8)
  assert.equal(state.history.length, 1)
  state = setup()
  await controller.rejectInventorySupplyRequest(request('farm_manager'), response())
  assert.equal(state.status, 'rejected')
  assert.equal(state.stock, 10)
  setup({ found: false })
  await assert.rejects(controller.approveInventorySupplyRequest(request('farm_manager'), response()), { status: 404 })
})
