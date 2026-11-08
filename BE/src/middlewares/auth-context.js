import { AsyncLocalStorage } from 'node:async_hooks'

export const authRequestStorage = new AsyncLocalStorage()

export function withAuthContext(req, res, callback) {
  return authRequestStorage.run({ req, res }, callback)
}

export function createExpressRequestContext() {
  const store = authRequestStorage.getStore()
  if (!store) throw new Error('Neon Auth request context is missing.')
  const { req, res } = store
  return {
    getCookies: () => {
      // A session lookup immediately after sign-in must use the newly issued token.
      const pending = res.getHeader('set-cookie') || []
      const pairs = [
        ...(req.headers.cookie || '').split(';'),
        ...(Array.isArray(pending) ? pending : [pending]).map(cookie => cookie.split(';')[0]),
      ]
      const cookies = new Map()
      for (const pair of pairs) {
        const separator = pair.indexOf('=')
        if (separator > 0) cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim())
      }
      return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
    },
    // Neon uses Set-Cookie seconds; Express res.cookie expects milliseconds.
    setCookie: (name, value, options) => res.cookie(name, value, {
      ...options,
      ...(options?.maxAge !== undefined ? { maxAge: options.maxAge * 1000 } : {}),
    }),
    getHeader: (name) => req.get(name) || null,
    getOrigin: () => req.get('origin') || `${req.protocol}://${req.get('host')}`,
    getFramework: () => 'express',
  }
}
