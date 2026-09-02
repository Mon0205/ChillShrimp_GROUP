import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

export async function listAreas(req, res) {
  const areas = await prisma.area.findMany({
    where: { farmId: req.params.farmId, ...(req.membership.role === 'area_manager' ? { id: req.membership.areaId } : {}) },
    orderBy: { name: 'asc' },
  })
  return sendData(res, areas)
}

export async function createArea(req, res) {
  const code = req.body.code?.trim().toUpperCase()
  const name = req.body.name?.trim()
  if (!code || !/^[A-Z0-9][A-Z0-9_-]{1,29}$/.test(code)) throw createHttpError(400, 'Mã khu vực phải có 2-30 ký tự hợp lệ.')
  if (!name || name.length > 120) throw createHttpError(400, 'Tên khu vực phải từ 1 đến 120 ký tự.')
  try {
    return sendData(res, await prisma.area.create({ data: { farmId: req.params.farmId, code, name } }), 201)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã khu vực đã tồn tại trong trại.')
    throw error
  }
}
