import { prisma } from '../config/prisma.js'
import { createHttpError } from '../utils/http.js'

export async function accountAccess(user) {
  const memberships = await prisma.farmMember.findMany({
    where: { userId: user.id }, select: { role: true, status: true },
  })
  const active = memberships.filter((member) => member.status === 'active')
  if (memberships.length && !active.length) {
    throw createHttpError(403, 'Tài khoản đã bị ngưng sử dụng tại tất cả các trại.')
  }
  const bootstrap = !memberships.length && Boolean(process.env.ADMIN_EMAIL?.trim()) &&
    user.email?.toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase()
  return { canCreateFarm: bootstrap || active.some((member) => member.role === 'owner') }
}
