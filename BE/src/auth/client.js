import { createAuthServer } from '@neondatabase/auth/server'
import { createExpressRequestContext } from './context.js'

if (!process.env.NEON_AUTH_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
  throw new Error('Thiếu NEON_AUTH_URL hoặc NEON_AUTH_COOKIE_SECRET trong BE/.env')
}

export const neonAuth = createAuthServer({
  baseUrl: process.env.NEON_AUTH_URL,
  context: createExpressRequestContext,
  cookieSecret: process.env.NEON_AUTH_COOKIE_SECRET,
  sameSite: 'lax',
})
