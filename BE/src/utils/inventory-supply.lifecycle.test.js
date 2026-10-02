import test from 'node:test'
import assert from 'node:assert/strict'
import { Prisma } from '@prisma/client'
import { assertInventorySupplyDeletable } from './inventory-supply.lifecycle.js'

test('allows deleting a zero-stock supply with no transaction history', () => {
  assert.doesNotThrow(() => assertInventorySupplyDeletable({
    quantity: new Prisma.Decimal(0),
    transactionCount: 0,
  }))
})

test('blocks deleting a supply with remaining stock', () => {
  assert.throws(() => assertInventorySupplyDeletable({
    quantity: new Prisma.Decimal('0.001'),
    transactionCount: 0,
  }), { status: 409 })
})

test('preserves supplies referenced by stock transaction history', () => {
  assert.throws(() => assertInventorySupplyDeletable({
    quantity: new Prisma.Decimal(0),
    transactionCount: 1,
  }), { status: 409 })
})
