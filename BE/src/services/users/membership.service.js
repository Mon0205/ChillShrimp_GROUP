import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'
import { isSystemAdmin } from '../auth/account-access.service.js'

export async function loadMembership({ farmId, actor, allowArchivedFarm = false }) {
  const admin = isSystemAdmin(actor)
  const farm = admin ? await prisma.farm.findUnique({ where: { id: farmId }, select: { status: true } }) : null
  if (admin && !farm) throw createHttpError(404, 'Không tìm thấy trang trại.')
  const membership = admin ? { farmId, userId: actor.id, role: 'owner', status: 'active', areaId: null, farm } : await prisma.farmMember.findUnique({
    where: { farmId_userId: { farmId, userId: actor.id } },
    include: { farm: { select: { status: true } } },
  })
  if (!membership) throw createHttpError(403, 'Bạn không thuộc trại này.')
  if (membership.status === 'suspended') throw createHttpError(403, 'Tài khoản của bạn đã bị ngưng sử dụng tại trại này.')
  if (!allowArchivedFarm && ['inactive', 'archived'].includes(membership.farm.status)) {
    throw createHttpError(409, 'Trang trại đã ngừng hoạt động. Hãy kích hoạt lại trang trại trước khi tiếp tục.')
  }
  return membership
}
