import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { Prisma } from '@prisma/client'
import { createInventoryTransactionRouter } from './inventory-transaction.routes.js'
import { createTreatmentLogRouter } from './treatment-log.routes.js'
import { resetPrismaClientForTests, setPrismaClientForTests } from '../config/prisma.js'

const farmId = '2874b2ba-1c01-4527-a41a-a37b586170d7'
const otherFarmId = '3874b2ba-1c01-4527-a41a-a37b586170d7'
const supplyId = '9cbe76d4-3280-4f7c-b197-c54066daf410'
const tankId = '4874b2ba-1c01-4527-a41a-a37b586170d7'
const userId = 'user-1'
const tank = { id: tankId, farmId, code: 'T-01', name: 'Nursery 1' }

let server
let db

function decimal(value) { return new Prisma.Decimal(String(value)) }

function createPrismaMock({ role = 'owner', supplyFarmId = farmId, category = 'medicine', quantity = 5, failStockUpdate = false } = {}) {
  db = {
    supply: { id: supplyId, farmId: supplyFarmId, name: 'Probiotic', category, unit: 'kg', quantity: decimal(quantity), unitPrice: decimal(10), minThreshold: decimal(1) },
    transactions: [],
    treatmentLogs: [],
  }

  const matchesSupply = (where = {}) => {
    if (where.id && where.id !== db.supply.id) return false
    if (where.farmId && where.farmId !== db.supply.farmId) return false
    if (where.category === 'feed' && db.supply.category !== 'feed') return false
    if (where.category?.in && !where.category.in.includes(db.supply.category)) return false
    return true
  }

  const transactionClient = {
    $queryRaw: async (...args) => {
      const queryValues = args[0]?.values || args.slice(1)
      return queryValues[0] === db.supply.id && queryValues[1] === db.supply.farmId ? [{ id: db.supply.id }] : []
    },
    inventorySupply: {
      findFirst: async ({ where }) => matchesSupply(where) ? db.supply : null,
      updateMany: async ({ where, data }) => {
        if (!matchesSupply(where) || failStockUpdate) return { count: 0 }
        if (data.quantity?.increment) db.supply.quantity = db.supply.quantity.plus(data.quantity.increment)
        if (data.quantity?.decrement) db.supply.quantity = db.supply.quantity.minus(data.quantity.decrement)
        if (data.unitPrice) db.supply.unitPrice = data.unitPrice
        return { count: 1 }
      },
    },
    inventoryTransaction: {
      create: async ({ data }) => {
        const item = {
          id: `transaction-${db.transactions.length + 1}`,
          ...data,
          supply: { id: db.supply.id, name: db.supply.name, category: db.supply.category, unit: db.supply.unit },
          creator: { id: userId, displayName: 'Test User', email: 'test@example.com' },
          createdAt: new Date(),
        }
        db.transactions.push(item)
        return item
      },
      findMany: async ({ where, skip = 0, take = 100 }) => db.transactions.filter((item) => item.transactionType === where.transactionType
        && db.supply.farmId === where.supply.is.farmId
        && (!where.supplyId || item.supplyId === where.supplyId)
        && (!where.transactionDate?.gte || item.transactionDate >= where.transactionDate.gte)
        && (!where.transactionDate?.lte || item.transactionDate <= where.transactionDate.lte)).slice(skip, skip + take),
      count: async ({ where }) => db.transactions.filter((item) => item.transactionType === where.transactionType
        && db.supply.farmId === where.supply.is.farmId
        && (!where.supplyId || item.supplyId === where.supplyId)).length,
    },
    treatmentLog: {
      create: async ({ data }) => {
        const item = {
          id: `treatment-${db.treatmentLogs.length + 1}`,
          ...data,
          tank: { id: tank.id, code: tank.code, name: tank.name },
          performer: { id: userId, displayName: 'Test User', email: 'test@example.com' },
          supply: { id: db.supply.id, name: db.supply.name, category: db.supply.category, unit: db.supply.unit },
        }
        db.treatmentLogs.push(item)
        return item
      },
    },
    seedBatch: { findFirst: async () => null },
  }

  return {
    farmMember: {
      findUnique: async () => ({ role, areaId: role === 'technician' ? 'area-1' : null, status: 'active', farm: { status: 'active' } }),
    },
    pondTank: { findFirst: async ({ where }) => where.farmId === farmId && where.id === tankId ? tank : null },
    inventorySupply: transactionClient.inventorySupply,
    inventoryTransaction: transactionClient.inventoryTransaction,
    treatmentLog: transactionClient.treatmentLog,
    seedBatch: transactionClient.seedBatch,
    $transaction: async (operation) => {
      if (Array.isArray(operation)) return Promise.all(operation)
      const snapshot = {
        quantity: db.supply.quantity,
        unitPrice: db.supply.unitPrice,
        transactionsLength: db.transactions.length,
        treatmentsLength: db.treatmentLogs.length,
      }
      try { return await operation(transactionClient) }
      catch (error) {
        db.supply.quantity = snapshot.quantity
        db.supply.unitPrice = snapshot.unitPrice
        db.transactions.length = snapshot.transactionsLength
        db.treatmentLogs.length = snapshot.treatmentsLength
        throw error
      }
    },
  }
}

async function startApi(options = {}) {
  setPrismaClientForTests(createPrismaMock(options))
  const app = express()
  app.use(express.json())
  const authenticate = (req, _res, next) => { req.auth = { id: userId, email: 'test@example.com' }; next() }
  app.use(`/api/farms/:farmId/inventory-transactions`, createInventoryTransactionRouter({ authenticate }))
  app.use(`/api/farms/:farmId/treatment-logs`, createTreatmentLogRouter({ authenticate }))
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ message: error.message }))
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  return `http://127.0.0.1:${server.address().port}/api/farms/${farmId}`
}

async function post(url, body) {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return { response, body: await response.json() }
}

async function get(url) {
  const response = await fetch(url)
  return { response, body: await response.json() }
}

afterEach(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  server = null
  resetPrismaClientForTests()
})

test('imports stock for an owner and persists quantity and unit price with an import ledger entry', async () => {
  const baseUrl = await startApi({ role: 'owner', quantity: 2 })
  const { response, body } = await post(`${baseUrl}/inventory-transactions/imports`, {
    supplyId, quantity: 3.5, unitPrice: 12.75, transactionDate: '2026-10-05T08:00:00.000Z', notes: 'Invoice 1001',
  })

  assert.equal(response.status, 201)
  assert.equal(body.data.transactionType, 'import')
  assert.equal(body.data.quantity, '3.5')
  assert.equal(body.data.unitPrice, '12.75')
  assert.equal(db.supply.quantity.toString(), '5.5')
  assert.equal(db.supply.unitPrice.toString(), '12.75')
  assert.equal(db.transactions.length, 1)
})

test('lists a farm-scoped, paginated import history for a supply', async () => {
  const baseUrl = await startApi({ role: 'warehouse_staff' })
  await post(`${baseUrl}/inventory-transactions/imports`, {
    supplyId, quantity: 3, unitPrice: 12.75, transactionDate: '2026-10-05T08:00:00.000Z', notes: 'Invoice 1002',
  })
  const { response, body } = await get(`${baseUrl}/inventory-transactions/imports?supplyId=${supplyId}&page=1&limit=10`)

  assert.equal(response.status, 200)
  assert.equal(body.data.items.length, 1)
  assert.equal(body.data.items[0].transactionType, 'import')
  assert.equal(body.data.pagination.total, 1)
})

test('allows warehouse staff to import and rejects roles without inventory management access', async () => {
  let baseUrl = await startApi({ role: 'warehouse_staff' })
  let result = await post(`${baseUrl}/inventory-transactions/imports`, {
    supplyId, quantity: 1, unitPrice: 10, transactionDate: '2026-10-05T08:00:00.000Z',
  })
  assert.equal(result.response.status, 201)

  await new Promise((resolve) => server.close(resolve))
  server = null
  baseUrl = await startApi({ role: 'technician' })
  result = await post(`${baseUrl}/inventory-transactions/imports`, {
    supplyId, quantity: 1, unitPrice: 10, transactionDate: '2026-10-05T08:00:00.000Z',
  })
  assert.equal(result.response.status, 403)
})

test('rejects supply from another farm without changing stock or creating a transaction', async () => {
  const baseUrl = await startApi({ supplyFarmId: otherFarmId })
  const { response } = await post(`${baseUrl}/inventory-transactions/imports`, {
    supplyId, quantity: 1, unitPrice: 10, transactionDate: '2026-10-05T08:00:00.000Z',
  })

  assert.equal(response.status, 404)
  assert.equal(db.supply.quantity.toString(), '5')
  assert.equal(db.transactions.length, 0)
})

test('treatment rejects inventory products outside medicine, chemical, or probiotic categories', async () => {
  const baseUrl = await startApi({ category: 'feed' })
  const { response } = await post(`${baseUrl}/treatment-logs`, {
    tankId, supplyId, productName: 'Feed', amount: 1, unit: 'kg', purpose: 'Treatment',
    performedAt: '2026-10-05T08:00:00.000Z',
  })

  assert.equal(response.status, 404)
  assert.equal(db.treatmentLogs.length, 0)
  assert.equal(db.transactions.length, 0)
})

test('treatment with insufficient stock returns conflict without writing a log or transaction', async () => {
  const baseUrl = await startApi({ quantity: 1 })
  const { response } = await post(`${baseUrl}/treatment-logs`, {
    tankId, supplyId, productName: 'Medicine', amount: 2, unit: 'kg', purpose: 'Treatment',
    performedAt: '2026-10-05T08:00:00.000Z',
  })

  assert.equal(response.status, 409)
  assert.equal(db.supply.quantity.toString(), '1')
  assert.equal(db.treatmentLogs.length, 0)
  assert.equal(db.transactions.length, 0)
})

test('rolls back a treatment log when the stock update loses a race', async () => {
  const baseUrl = await startApi({ quantity: 5, failStockUpdate: true })
  const { response } = await post(`${baseUrl}/treatment-logs`, {
    tankId, supplyId, productName: 'Medicine', amount: 2, unit: 'kg', purpose: 'Treatment',
    performedAt: '2026-10-05T08:00:00.000Z',
  })

  assert.equal(response.status, 409)
  assert.equal(db.supply.quantity.toString(), '5')
  assert.equal(db.treatmentLogs.length, 0)
  assert.equal(db.transactions.length, 0)
})
