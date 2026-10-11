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
    getCookies: () => req.headers.cookie || '',
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
