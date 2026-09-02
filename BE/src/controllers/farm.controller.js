import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

const normalizeCode = (value) => value?.trim().toUpperCase()
const validCode = (value) => /^[A-Z0-9][A-Z0-9_-]{1,29}$/.test(value || '')

export async function listFarms(req, res) {
  const roles = req.query.manageable === 'true' ? ['owner', 'area_manager'] : undefined
  const memberships = await prisma.farmMember.findMany({
    where: { userId: req.auth.id, status: 'active', ...(roles ? { role: { in: roles } } : {}) },
    include: { farm: true, area: { select: { id: true, code: true, name: true } } }, orderBy: { farm: { createdAt: 'desc' } },
  })
  return sendData(res, memberships.map(({ farm, role, area }) => ({ ...farm, role, area })))
}

export async function createFarm(req, res) {
  const code = normalizeCode(req.body.code)
  const name = req.body.name?.trim()
  if (!validCode(code)) throw createHttpError(400, 'Mã trại phải có 2-30 ký tự, chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.')
  if (!name || name.length > 120) throw createHttpError(400, 'Tên trại phải từ 1 đến 120 ký tự.')
  try {
    const farm = await prisma.$transaction(async (tx) => {
      const created = await tx.farm.create({ data: { code, name, address: req.body.address?.trim() || null, createdBy: req.auth.id } })
      await tx.farmMember.create({ data: { farmId: created.id, userId: req.auth.id, role: 'owner' } })
      return created
    })
    return sendData(res, farm, 201)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã trại đã tồn tại. Vui lòng chọn mã khác.')
    throw error
  }
}

export async function updateFarm(req, res) {
  const data = {}
  if (typeof req.body.code === 'string') {
    const code = normalizeCode(req.body.code)
    if (!validCode(code)) throw createHttpError(400, 'Mã trại phải có 2-30 ký tự, chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.')
    data.code = code
  }
  if (typeof req.body.name === 'string') {
    const name = req.body.name.trim()
    if (!name || name.length > 120) throw createHttpError(400, 'Tên trại phải từ 1 đến 120 ký tự.')
    data.name = name
  }
  if (typeof req.body.address === 'string' || req.body.address === null) data.address = req.body.address?.trim() || null
  try {
    return sendData(res, await prisma.farm.update({ where: { id: req.params.farmId }, data }))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã trại đã tồn tại. Vui lòng chọn mã khác.')
    throw error
  }
}

export async function deleteFarm(req, res) {
  const farm = await prisma.farm.findUnique({ where: { id: req.params.farmId } })
  if (!farm || farm.createdBy !== req.auth.id) throw createHttpError(403, 'Chỉ chủ trại mới được xoá trại.')
  await prisma.farm.delete({ where: { id: farm.id } })
  return res.status(204).end()
}
