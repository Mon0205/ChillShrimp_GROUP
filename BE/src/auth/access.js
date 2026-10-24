import { prisma } from '../config/prisma.js'
import { createHttpError } from '../utils/http.js'

export function isSystemAdmin(user) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  return Boolean(email && typeof user?.email === 'string' && user.email.trim().toLowerCase() === email)
}

export async function accountAccess(user) {
  if (isSystemAdmin(user)) return { isSystemAdmin: true, canCreateFarm: true }
  const memberships = await prisma.farmMember.findMany({
    where: { userId: user.id }, select: { role: true, status: true },
  })
  const active = memberships.filter((member) => member.status === 'active')
  if (memberships.length && !active.length) {
    throw createHttpError(403, 'Tài khoản đã bị ngưng sử dụng tại tất cả các trại.')
  }
  return { isSystemAdmin: false, canCreateFarm: active.some((member) => member.role === 'owner') }
}
