import crypto from 'node:crypto'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

export async function listUsers(req, res) {
  const members = await prisma.farmMember.findMany({
    where: { farmId: req.query.farmId, ...(req.membership.role === 'area_manager' ? { areaId: req.membership.areaId } : {}) },
    select: {
      role: true,
      status: true,
      createdAt: true,
      area: { select: { id: true, code: true, name: true } },
      user: { select: { id: true, email: true, displayName: true, phone: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return sendData(res, members.map(({ user, ...membership }) => ({ ...user, ...membership })))
}

export async function getProfile(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.auth.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      phone: true,
      memberships: {
        select: {
          role: true,
          status: true,
          farm: { select: { id: true, code: true, name: true } },
          area: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!user) throw createHttpError(404, 'Không tìm thấy thông tin người dùng.')
  return sendData(res, user)
}

export async function getInvitation(req, res) {
  const token = req.params.token
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) throw createHttpError(400, 'Liên kết lời mời không hợp lệ.')
  const invitation = await prisma.farmInvitation.findUnique({
    where: { tokenHash: crypto.createHash('sha256').update(token).digest('hex') },
    select: { email: true, role: true, status: true, expiresAt: true, farm: { select: { name: true } }, area: { select: { name: true } } },
  })
  if (!invitation || invitation.status !== 'pending' || invitation.expiresAt <= new Date()) throw createHttpError(410, 'Lời mời đã hết hạn, đã được sử dụng hoặc đã bị thu hồi.')
  return sendData(res, { email: invitation.email, role: invitation.role, farmName: invitation.farm.name, areaName: invitation.area?.name || null, expiresAt: invitation.expiresAt })
}

export async function checkInvitationEmail(req, res) {
  const email = req.query.email?.trim().toLowerCase()
  const farmId = req.query.farmId
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return sendData(res, { available: false, code: 'INVALID_EMAIL' })
  const [user, pending] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.farmInvitation.findFirst({ where: { farmId, email, status: 'pending' } }),
  ])
  const code = user ? 'USER_EXISTS' : pending ? 'INVITATION_PENDING' : 'AVAILABLE'
  return sendData(res, { available: code === 'AVAILABLE', code })
}

export async function listInvitations(req, res) {
  const farmId = req.query.farmId
  if (!farmId) throw createHttpError(400, 'Thiếu mã trại.')
  const invitations = await prisma.farmInvitation.findMany({
    where: { farmId, status: 'pending', ...(req.membership.role === 'area_manager' ? { areaId: req.membership.areaId } : {}) },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true, area: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return sendData(res, invitations)
}
