import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

process.env.NEON_AUTH_URL = 'https://auth.example.test/auth'
process.env.NEON_AUTH_COOKIE_SECRET = 'test-secret-with-at-least-32-characters'
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test'

const { neonAuth } = await import('../src/auth/client.js')
const { readNeonSession, getMe } = await import('../src/auth/get.js')
const { login, logout } = await import('../src/auth/post.js')
const { requireAuth } = await import('../src/middlewares/auth.middleware.js')
const { requestPasswordOtp, resetPasswordWithOtp } = await import('../src/users/password.js')
const { setPrismaClientForTests, resetPrismaClientForTests } = await import('../src/config/prisma.js')
const { createExpressRequestContext, withAuthContext } = await import('../src/auth/context.js')
const originalGetSession = neonAuth.getSession
const originalSignIn = neonAuth.signIn
const originalSignOut = neonAuth.signOut
const now = Date.parse('2026-10-24T10:00:00Z')
const hour = 60 * 60 * 1000
const user = { id: 'neon-user', email: 'user@example.test', displayName: 'Test' }

function session(createdAt = now - hour, expiresAt = now + 7 * 24 * hour) {
  return { user, session: { id: 'neon-session', userId: user.id, createdAt: new Date(createdAt).toISOString(), expiresAt: new Date(expiresAt).toISOString() } }
}

function response() {
  return {
    headers: {},
    getHeader(name) { return this.headers[name] },
    cookie(name, value) { (this.headers['set-cookie'] ||= []).push(`${name}=${value}; Path=/`) },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

function setup(t, data = session()) {
  t.mock.timers.enable({ apis: ['Date'], now })
  neonAuth.getSession = t.mock.fn(async () => ({ data, error: null }))
  setPrismaClientForTests({
    user: { findUnique: async () => user },
    farmMember: { findMany: async () => [{ role: 'owner', status: 'active' }] },
  })
}

afterEach(() => {
  neonAuth.getSession = originalGetSession
  neonAuth.signIn = originalSignIn
  neonAuth.signOut = originalSignOut
  resetPrismaClientForTests()
})

test('me uses only the Neon session and returns a fixed 24-hour deadline', async t => {
  setup(t)
  const res = response()
  await getMe({ headers: {} }, res)
  assert.equal(res.body.data.id, user.id)
  assert.equal(new Date(res.body.data.sessionExpiresAt).getTime(), now + 23 * hour)
  assert.deepEqual(neonAuth.getSession.mock.calls[0].arguments, [{ query: { disableCookieCache: 'true' } }])
  t.mock.timers.tick(hour)
  await getMe({ headers: {} }, res)
  assert.equal(new Date(res.body.data.sessionExpiresAt).getTime(), now + 23 * hour)
})

test('a shorter Neon expiry is respected', async t => {
  setup(t, session(now - hour, now + hour))
  const res = response()
  await getMe({ headers: {} }, res)
  assert.equal(new Date(res.body.data.sessionExpiresAt).getTime(), now + hour)
})

for (const [label, data] of [
  ['exactly 24 hours old', session(now - 24 * hour)],
  ['older than 24 hours despite refreshed Neon expiry', session(now - 25 * hour)],
  ['expired at Neon', session(now - hour, now)],
  ['missing session', { user }],
  ['invalid creation date', { user, session: { createdAt: 'invalid', expiresAt: new Date(now + hour).toISOString() } }],
  ['missing creation date', { user, session: { expiresAt: new Date(now + hour).toISOString() } }],
  ['future creation date', session(now + hour)],
]) {
  test(`rejects a session ${label}`, async t => {
    setup(t, data)
    await assert.rejects(readNeonSession({ headers: {} }, response()), { status: 401 })
  })
}

test('a revoked Neon session is rejected by protected middleware', async t => {
  setup(t, null)
  let failure
  await requireAuth({ headers: {} }, response(), error => { failure = error })
  assert.equal(failure.status, 401)
})

test('a Neon outage remains 503 instead of being treated as a logout', async t => {
  setup(t)
  neonAuth.getSession = async () => ({ data: null, error: { status: 502 } })
  await assert.rejects(readNeonSession({ headers: {} }, response()), { status: 503 })
})

test('login uses the newly issued Neon session without an application session table', async t => {
  setup(t, session(now))
  neonAuth.signIn = { email: async () => ({ data: { user, token: 'test-token' }, error: null }) }
  const res = response()
  await login({ body: { email: user.email, password: 'password' }, headers: {} }, res)
  assert.equal(new Date(res.body.data.user.sessionExpiresAt).getTime(), now + 24 * hour)
  assert.equal(res.body.data.user.canCreateFarm, true)
})

test('logout calls Neon signOut and propagates provider failure', async t => {
  setup(t)
  neonAuth.signOut = t.mock.fn(async () => ({ data: { success: true }, error: null }))
  const res = response()
  await logout({ headers: {} }, res)
  assert.equal(neonAuth.signOut.mock.callCount(), 1)
  assert.equal(res.body.data.signedOut, true)
  neonAuth.signOut = async () => ({ data: null, error: { status: 502 } })
  await assert.rejects(logout({ headers: {} }, response()), { status: 503 })
})

test('auth context sees response cookies from sign-in before the next browser request', async () => {
  const req = { headers: { cookie: 'neon-auth.session_token=old; preference=dark' } }
  const res = response()
  await withAuthContext(req, res, async () => {
    createExpressRequestContext().setCookie('neon-auth.session_token', 'fresh', {})
    const cookies = createExpressRequestContext().getCookies()
    assert.match(cookies, /neon-auth\.session_token=fresh/)
    assert.match(cookies, /preference=dark/)
    assert.doesNotMatch(cookies, /session_token=old/)
  })
})

test('real SDK login reads the new cookie and bypasses cached session data', async t => {
  setup(t)
  neonAuth.getSession = originalGetSession
  neonAuth.signIn = originalSignIn
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const path = new URL(url).pathname
    calls.push({ url: String(url), cookie: options.headers.Cookie })
    if (path.endsWith('/sign-in/email')) {
      return Response.json({ user, token: 'fresh-token' }, {
        headers: { 'set-cookie': 'neon-auth.session_token=fresh-token; Path=/; HttpOnly' },
      })
    }
    assert.match(path, /get-session$/)
    return Response.json(session(now))
  })
  const req = {
    body: { email: user.email, password: 'password' },
    headers: { cookie: 'neon-auth.session_token=old-token' },
    protocol: 'https',
    get: name => name === 'host' ? 'app.example.test' : undefined,
  }
  const res = response()
  await login(req, res)
  const freshLookup = calls.find(call => call.url.includes('disableCookieCache=true'))
  assert.ok(freshLookup)
  assert.match(freshLookup.cookie, /session_token=fresh-token/)
  assert.doesNotMatch(freshLookup.cookie, /session_token=old-token/)
  assert.equal(new Date(res.body.data.user.sessionExpiresAt).getTime(), now + 24 * hour)
  assert.ok(res.headers['set-cookie'].every(cookie => !cookie.startsWith('chillshrimp_session=')))
})

test('password OTP still has a 60-second application deadline', async t => {
  setup(t)
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true }))
  let stored
  setPrismaClientForTests({ passwordResetOtpWindow: { upsert: async args => { stored = args } } })
  const res = response()
  await requestPasswordOtp({ body: { email: user.email } }, res)
  assert.equal(res.body.data.expiresAt.getTime(), now + 60_000)
  assert.equal(stored.create.expiresAt.getTime(), now + 60_000)
  assert.equal(stored.update.expiresAt.getTime(), now + 60_000)
})

for (const [label, window, status] of [
  ['expired at exactly 60 seconds', { expiresAt: new Date(now) }, 410],
  ['already consumed', null, 400],
]) {
  test(`password OTP ${label} cannot reach the provider reset endpoint`, async t => {
    setup(t)
    const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Must reject before calling Neon') })
    setPrismaClientForTests({ passwordResetOtpWindow: { findUnique: async () => window } })
    await assert.rejects(resetPasswordWithOtp({ body: {
      email: user.email, otp: '123456', newPassword: 'new-password', confirmPassword: 'new-password',
    } }, response()), { status })
    assert.equal(fetch.mock.callCount(), 0)
  })
}

test('a valid OTP is checked by Neon and its window is consumed on success', async t => {
  setup(t)
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true }))
  const expiresAt = new Date(now + 30_000)
  let deleted
  setPrismaClientForTests({ passwordResetOtpWindow: {
    findUnique: async () => ({ expiresAt }),
    deleteMany: async args => { deleted = args },
  } })
  await resetPasswordWithOtp({ body: {
    email: user.email, otp: '123456', newPassword: 'new-password', confirmPassword: 'new-password',
  } }, response())
  assert.equal(fetch.mock.callCount(), 1)
  assert.deepEqual(deleted.where, { email: user.email, expiresAt })
})
