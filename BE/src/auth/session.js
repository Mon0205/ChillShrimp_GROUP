import crypto from 'node:crypto'
import { prisma } from '../config/prisma.js'
import { createHttpError } from '../utils/http.js'

const COOKIE_NAME = 'chillshrimp_session'
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000
const IDLE_TIMEOUT_MS = 30 * 60 * 1000

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_LIFETIME_MS,
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function readCookie(req) {
  const cookies = String(req.headers.cookie || '').split(';')
  const item = cookies.find((cookie) => cookie.trim().startsWith(`${COOKIE_NAME}=`))
  return item ? decodeURIComponent(item.trim().slice(COOKIE_NAME.length + 1)) : null
}

export async function createAccessSession(userId, res) {
  const token = crypto.randomBytes(32).toString('hex')
  const now = new Date()
  await prisma.accessSession.create({
    data: { userId, tokenHash: hashToken(token), lastActivity: now, expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS) },
  })
  res.cookie(COOKIE_NAME, token, cookieOptions)
}

export async function requireAccessSession(req, res, userId) {
  const token = readCookie(req)
  if (!token) throw createHttpError(401, 'Phiên đăng nhập đã hết hạn.')

  const session = await prisma.accessSession.findUnique({ where: { tokenHash: hashToken(token) } })
  const now = new Date()
  const idleExpired = !session || now.getTime() - session.lastActivity.getTime() >= IDLE_TIMEOUT_MS
  if (!session || session.userId !== userId || session.expiresAt <= now || idleExpired) {
    if (session) await prisma.accessSession.delete({ where: { id: session.id } }).catch(() => {})
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' })
    throw createHttpError(401, 'Phiên đăng nhập đã hết hạn.')
  }

  await prisma.accessSession.update({
    where: { id: session.id },
    data: { lastActivity: now, expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS) },
  })
  res.cookie(COOKIE_NAME, token, cookieOptions)
  return session
}

export async function destroyAccessSession(req, res) {
  const token = readCookie(req)
  if (token) await prisma.accessSession.deleteMany({ where: { tokenHash: hashToken(token) } })
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' })
}
