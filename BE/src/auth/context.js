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
    setCookie: (name, value, options) => res.cookie(name, value, options),
    getHeader: (name) => req.get(name) || null,
    getOrigin: () => req.get('origin') || `${req.protocol}://${req.get('host')}`,
    getFramework: () => 'express',
  }
}
