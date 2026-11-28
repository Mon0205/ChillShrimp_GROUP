import { setTimeout as sleep } from 'node:timers/promises'

// AI_SERVICE on Render Free sleeps after 15 idle minutes; the first request then waits 20-60 s
// (sometimes longer) while Render starts it again. These helpers wake it and wait for /health
// before an image is sent, so a sleeping service delays an analysis instead of failing it.

const WAKE_TIMEOUT_MS = Number(process.env.AI_WAKE_TIMEOUT_MS || 150000)
const RETRY_DELAY_MS = 5000
const HEALTH_ATTEMPT_MS = 60000 // Render holds a request open while the instance starts
const EARLY_WAKE_INTERVAL_MS = 60000

let lastEarlyWake = 0

export function aiServiceUrl() {
  return (process.env.AI_SERVICE_URL || 'http://localhost:8001').replace(/\/$/, '')
}


// Resolves once GET /health answers 2xx; rejects after `timeoutMs`, or as soon as `signal` aborts
// (the caller gave up, e.g. the image download failed, so there is no point in waking the service).
export async function waitForAiService({ baseUrl = aiServiceUrl(), timeoutMs = WAKE_TIMEOUT_MS, retryDelayMs = RETRY_DELAY_MS, signal } = {}) {
  const deadline = Date.now() + timeoutMs
  let lastProblem = 'no answer'
  for (;;) {
    signal?.throwIfAborted()
    const remaining = deadline - Date.now()
    const attempt = AbortSignal.timeout(Math.max(1000, Math.min(HEALTH_ATTEMPT_MS, remaining)))
    let misconfigured = false
    try {
      const response = await fetch(`${baseUrl}/health`, { signal: signal ? AbortSignal.any([signal, attempt]) : attempt })
      if (response.ok) return
      lastProblem = `HTTP ${response.status}`
      // A sleeping or starting service is worth waiting for; one reporting not_ready will not recover.
      if (response.status === 503) misconfigured = (await response.json().catch(() => null))?.status === 'not_ready'
    } catch (error) {
      lastProblem = error.name === 'TimeoutError' ? 'timeout' : error.message
    }
    if (misconfigured) throw new Error('AI Service is not ready: check its model file and Cloudinary settings.')
    if (Date.now() + retryDelayMs >= deadline) {
      throw new Error(`AI Service did not become ready within ${Math.round(timeoutMs / 1000)} s (${lastProblem}).`)
    }
    await sleep(retryDelayMs, undefined, { signal })
  }
}

// Fire-and-forget: start waking the service while the user is still uploading the photo.
// At most one ping per minute, and errors are ignored (the analysis waits properly later).
export function wakeAiServiceEarly() {
  const now = Date.now()
  if (now - lastEarlyWake < EARLY_WAKE_INTERVAL_MS) return
  lastEarlyWake = now
  fetch(`${aiServiceUrl()}/health`, { signal: AbortSignal.timeout(HEALTH_ATTEMPT_MS) }).catch(() => {})
}
