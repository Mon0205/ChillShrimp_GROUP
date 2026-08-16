import jwt from 'jsonwebtoken'
import { prisma } from '../config/prisma.js'
import { createHttpError } from '../utils/http.js'

const jwtSecret = process.env.JWT_SECRET

export function requireAuth(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return next(createHttpError(401, 'Bạn cần đăng nhập để thực hiện thao tác này.'))
  try {
    req.auth = jwt.verify(token, jwtSecret)
    next()
  } catch {
    next(createHttpError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'))
  }
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
