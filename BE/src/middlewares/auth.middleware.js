import { prisma } from '../config/prisma.js'
import { createHttpError } from '../utils/http.js'
import { readNeonSession } from '../auth/get.js'

export async function requireAuth(req, res, next) {
  try {
    const session = await readNeonSession(req, res)
    req.auth = { id: session.user.id, email: session.user.email }
    next()
  } catch (error) { next(error) }
}

export async function requireFarmManager(req, _res, next) {
  try {
    const farmId = req.params.farmId || req.query.farmId || req.body.farmId
    if (!farmId) throw createHttpError(400, 'Thiếu mã trại.')
    const membership = await prisma.farmMember.findUnique({ where: { farmId_userId: { farmId, userId: req.auth.id } } })
    if (!membership || !['owner', 'manager'].includes(membership.role)) throw createHttpError(403, 'Bạn không có quyền quản lý trại này.')
    req.membership = membership
    next()
  } catch (error) { next(error) }
}
