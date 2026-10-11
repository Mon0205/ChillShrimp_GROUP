import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { randomUUID } from 'node:crypto'
import { createCustomerRouter } from './customer.routes.js'
import { setPrismaClientForTests, resetPrismaClientForTests } from '../config/prisma.js'

test('customer CRUD enforces owner, tenant scope, validation and soft deletion', async () => {
  const records = []
  const match = (x, w) => x.farmId === w.farmId && x.deletedAt === w.deletedAt && (!w.id || w.id === x.id) && (!w.customerType || x.customerType === w.customerType) && (!w.OR || w.OR.some(c => Object.entries(c).some(([k, v]) => x[k]?.toLowerCase().includes(v.contains.toLowerCase()))))
  setPrismaClientForTests({
    farmMember: { findUnique: async ({ where }) => ({ role: where.farmId_userId.userId, status: 'active', farm: { status: 'active' } }) },
    customer: {
      create: async ({ data }) => { const x = { id: randomUUID(), deletedAt: null, ...data }; records.push(x); return x },
      findFirst: async ({ where }) => records.find(x => match(x, where)) || null,
      findMany: async ({ where, skip, take }) => records.filter(x => match(x, where)).slice(skip, skip + take),
      count: async ({ where }) => records.filter(x => match(x, where)).length,
      updateMany: async ({ where, data }) => { const xs = records.filter(x => match(x, where)); xs.forEach(x => Object.assign(x, data)); return { count: xs.length } },
    },
    $transaction: async ops => Promise.all(ops),
  })
  const app = express()
  app.use(express.json())
  app.use('/farms/:farmId/customers', createCustomerRouter({ authenticate: (req, _res, next) => { req.auth = { id: req.headers['x-role'] || 'owner' }; next() } }))
  app.use((e, _req, res, _next) => res.status(e.status || 500).json({ message: e.message }))
  const server = app.listen(0)
  await new Promise(resolve => server.once('listening', resolve))
  const root = `http://127.0.0.1:${server.address().port}`
  const request = (path = '', method = 'GET', body, role = 'owner', farm = 'farm-a') => fetch(`${root}/farms/${farm}/customers${path}`, { method, headers: { 'Content-Type': 'application/json', 'x-role': role }, ...(body ? { body: JSON.stringify(body) } : {}) })
  try {
    for (const role of ['technician', 'area_manager', 'warehouse_staff']) assert.equal((await request('', 'POST', { name: 'Forbidden', customerType: 'farm' }, role)).status, 403)
    assert.equal(records.length, 0)
    for (const body of [{}, { name: 'X', customerType: 'bad' }, { name: 'X', customerType: 'farm', phone: 'abc' }, { name: 'X', customerType: 'farm', farmId: 'farm-b' }]) assert.equal((await request('', 'POST', body)).status, 400)
    const created = await request('', 'POST', { name: ' Customer ', phone: '0901234567', customerType: 'farm' })
    assert.equal(created.status, 201)
    const item = (await created.json()).data
    assert.equal(item.name, 'Customer')
    assert.equal((await request(`/${item.id}`, 'GET', undefined, 'owner', 'farm-b')).status, 404)
    assert.equal((await request(`/${item.id}`, 'PATCH', { name: 'Intruder' }, 'owner', 'farm-b')).status, 404)
    assert.equal((await request(`/${item.id}`, 'DELETE', undefined, 'owner', 'farm-b')).status, 404)
    assert.equal((await request(`/${item.id}`, 'PATCH', {})).status, 400)
    assert.equal((await request('/invalid')).status, 400)
    assert.equal((await request('?page=0')).status, 400)
    assert.equal((await request(`/${item.id}`, 'PATCH', { notes: 'Updated', customerType: 'household' })).status, 200)
    const filtered = await (await request('?q=090&customerType=household')).json()
    assert.equal(filtered.data.pagination.total, 1)
    assert.equal((await (await request('?customerType=farm')).json()).data.items.length, 0)
    assert.equal((await request(`/${item.id}`, 'DELETE')).status, 204)
    assert.ok(records[0].deletedAt)
    assert.equal((await request(`/${item.id}`)).status, 404)
    assert.equal((await request(`/${item.id}`, 'PATCH', { name: 'Restore?' })).status, 404)
    assert.equal((await (await request()).json()).data.pagination.total, 0)
  } finally {
    await new Promise(resolve => server.close(resolve))
    resetPrismaClientForTests()
  }
})
