import assert from 'node:assert/strict'
import test from 'node:test'
import { isSeedBatchEditable } from './seed-batch-lifecycle.js'

test('allows edits while a seed batch is active or ready for sale', () => {
  assert.equal(isSeedBatchEditable('active'), true)
  assert.equal(isSeedBatchEditable('ready_for_sale'), true)
})

test('prevents edits after a seed batch reaches a terminal status', () => {
  for (const status of ['sold', 'failed', 'cancelled']) {
    assert.equal(isSeedBatchEditable(status), false)
  }
})
