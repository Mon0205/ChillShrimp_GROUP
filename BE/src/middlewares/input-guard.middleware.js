import { createHttpError } from '../utils/http.js'

const NULL_CHARACTER = String.fromCharCode(0)
const ID_KEY = /Id$/

// Walks without recursion: a deeply nested body must not overflow the stack.
function assertSafeBody(body) {
  const pending = [body]
  while (pending.length) {
    const value = pending.pop()
    if (typeof value === 'string') {
      if (value.includes(NULL_CHARACTER)) throw createHttpError(400, 'Dữ liệu chứa ký tự không hợp lệ.')
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (ID_KEY.test(key) && child !== null && typeof child !== 'string') throw createHttpError(400, 'Mã định danh không hợp lệ.')
        pending.push(key, child)
      }
    }
  }
}

// Rejects input PostgreSQL or Prisma cannot take, before it turns into a server error.
export function rejectUnsafeInput(req, _res, next) {
  // Route parameters are not parsed yet here, so the encoded null is looked up in the raw URL.
  if (req.originalUrl.includes('%00')) return next(createHttpError(400, 'Dữ liệu chứa ký tự không hợp lệ.'))
  // No endpoint reads a repeated query parameter; lists are sent comma-separated.
  if (Object.values(req.query).some((value) => typeof value !== 'string')) return next(createHttpError(400, 'Tham số truy vấn bị lặp hoặc không hợp lệ.'))
  try { assertSafeBody(req.body) } catch (error) { return next(error) }
  next()
}
