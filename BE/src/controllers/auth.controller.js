import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

export async function login(req, res) {
  const email = req.body.email?.trim().toLowerCase()
  const password = req.body.password
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.passwordHash || !(await bcrypt.compare(password || '', user.passwordHash))) throw createHttpError(401, 'Email hoặc mật khẩu không đúng.')
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' })
  return sendData(res, { token, user: { id: user.id, email: user.email, displayName: user.displayName } })
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.auth.id }, select: { id: true, email: true, username: true, displayName: true, phone: true } })
  if (!user) throw createHttpError(401, 'Người dùng không còn tồn tại.')
  return sendData(res, user)
}

export async function acceptInvitation(req, res) {
  const { token, password } = req.body
  if (typeof token !== 'string' || typeof password !== 'string' || password.length < 8) throw createHttpError(400, 'Token hoặc mật khẩu không hợp lệ.')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const invitation = await prisma.farmInvitation.findUnique({ where: { tokenHash } })
  if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) throw createHttpError(400, 'Lời mời đã hết hạn hoặc không hợp lệ.')
  await prisma.$transaction([
    prisma.user.update({ where: { id: invitation.invitedUserId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
    prisma.farmInvitation.update({ where: { id: invitation.id }, data: { status: 'accepted', acceptedAt: new Date() } }),
  ])
  return sendData(res, { accepted: true })
}
