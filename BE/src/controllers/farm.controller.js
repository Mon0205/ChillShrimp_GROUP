import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

export async function listFarms(req, res) {
  const roles = req.query.manageable === 'true' ? ['owner', 'manager'] : undefined
  const memberships = await prisma.farmMember.findMany({
    where: { userId: req.auth.id, ...(roles ? { role: { in: roles } } : {}) },
    include: { farm: true }, orderBy: { farm: { createdAt: 'desc' } },
  })
  return sendData(res, memberships.map(({ farm }) => farm))
}

export async function createFarm(req, res) {
  const name = req.body.name?.trim()
  if (!name || name.length > 120) throw createHttpError(400, 'Tên trại phải từ 1 đến 120 ký tự.')
  const farm = await prisma.$transaction(async (tx) => {
    const created = await tx.farm.create({ data: { name, address: req.body.address?.trim() || null, createdBy: req.auth.id } })
    await tx.farmMember.create({ data: { farmId: created.id, userId: req.auth.id, role: 'owner' } })
    return created
  })
  return sendData(res, farm, 201)
}

export async function updateFarm(req, res) {
  const data = {}
  if (typeof req.body.name === 'string') {
    const name = req.body.name.trim()
    if (!name || name.length > 120) throw createHttpError(400, 'Tên trại phải từ 1 đến 120 ký tự.')
    data.name = name
  }
  if (typeof req.body.address === 'string' || req.body.address === null) data.address = req.body.address?.trim() || null
  return sendData(res, await prisma.farm.update({ where: { id: req.params.farmId }, data }))
}

export async function deleteFarm(req, res) {
  const farm = await prisma.farm.findUnique({ where: { id: req.params.farmId } })
  if (!farm || farm.createdBy !== req.auth.id) throw createHttpError(403, 'Chỉ chủ trại mới được xoá trại.')
  await prisma.farm.delete({ where: { id: farm.id } })
  return res.status(204).end()
}
