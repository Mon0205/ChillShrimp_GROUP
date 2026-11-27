import { test } from 'node:test'
import assert from 'node:assert/strict'
import { waitForAiService } from '../src/services/seed/ai-service-client.js'

test('waits through failed /health answers until the AI service is up', async (t) => {
  const answers = [new TypeError('fetch failed'), { ok: false, status: 502 }, { ok: true, status: 200 }]
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url)
    const answer = answers.shift()
    if (answer instanceof Error) throw answer
    return answer
  })
  await waitForAiService({ baseUrl: 'http://ai.test', timeoutMs: 1000, retryDelayMs: 1 })
  assert.deepEqual(calls, ['http://ai.test/health', 'http://ai.test/health', 'http://ai.test/health'])
})

test('gives up with the last problem once the wake timeout is spent', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 503 }))
  await assert.rejects(
    waitForAiService({ baseUrl: 'http://ai.test', timeoutMs: 50, retryDelayMs: 10 }),
    /did not become ready .*HTTP 503/,
  )
})
