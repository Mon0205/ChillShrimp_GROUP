import { prisma } from '../config/prisma.js'
import { createHttpError } from '../utils/http.js'

export async function revokeInvitation(req, res) {
  const invitation = await prisma.farmInvitation.findUnique({ where: { id: req.params.invitationId } })
  if (!invitation || invitation.status !== 'pending') throw createHttpError(404, 'Không tìm thấy lời mời đang chờ.')
  const membership = await prisma.farmMember.findUnique({ where: { farmId_userId: { farmId: invitation.farmId, userId: req.auth.id } } })
  if (!membership || !['owner', 'manager'].includes(membership.role)) throw createHttpError(403, 'Bạn không có quyền thu hồi lời mời này.')
  await prisma.farmInvitation.update({ where: { id: invitation.id }, data: { status: 'cancelled' } })
  return res.status(204).end()
}
