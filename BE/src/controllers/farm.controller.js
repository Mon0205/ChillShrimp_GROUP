import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

const normalizeCode = (value) => value?.trim().toUpperCase()
const validCode = (value) => /^[A-Z0-9][A-Z0-9_-]{1,29}$/.test(value || '')
const FARM_STATUSES = ['active', 'archived']

export async function listFarms(req, res) {
  const includeArchived = req.query.includeArchived === 'true'
  if (req.query.includeArchived !== undefined && !['true', 'false'].includes(req.query.includeArchived)) {
    throw createHttpError(400, 'Tham số includeArchived không hợp lệ.')
  }
  const roles = req.query.manageable === 'true' ? ['owner', 'area_manager'] : undefined
  const memberships = await prisma.farmMember.findMany({
    where: {
      userId: req.auth.id,
      status: 'active',
      ...(roles ? { role: { in: roles } } : {}),
      ...(includeArchived
        ? { OR: [{ farm: { status: 'active' } }, { role: 'owner', farm: { status: 'archived' } }] }
        : { farm: { status: 'active' } }),
    },
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

async function archiveFarm(req) {
  const farmId = req.params.farmId
  const [activeAreas, operationalPondsTanks, pendingInvitations, activeStaff] = await Promise.all([
    prisma.area.count({ where: { farmId, status: 'active' } }),
    prisma.pondTank.count({ where: { farmId, deletedAt: null, status: { not: 'inactive' } } }),
    prisma.farmInvitation.count({ where: { farmId, status: 'pending' } }),
    prisma.farmMember.count({ where: { farmId, status: 'active', role: { not: 'owner' } } }),
  ])
  if (activeAreas || operationalPondsTanks || pendingInvitations || activeStaff) {
    throw createHttpError(
      409,
      `Không thể lưu trữ trang trại: còn ${activeAreas} khu vực hoạt động, ${operationalPondsTanks} ao/bể chưa ngừng sử dụng, ${pendingInvitations} lời mời đang chờ và ${activeStaff} nhân viên đang hoạt động.`,
    )
  }
  return prisma.farm.update({
    where: { id: farmId },
    data: { status: 'archived', archivedAt: new Date(), archivedBy: req.auth.id },
  })
}

export async function updateFarmStatus(req, res) {
  const status = req.body.status
  if (!FARM_STATUSES.includes(status)) throw createHttpError(400, 'Trạng thái trang trại không hợp lệ.')
  const farm = await prisma.farm.findUnique({ where: { id: req.params.farmId } })
  if (!farm) throw createHttpError(404, 'Không tìm thấy trang trại.')
  if (farm.status === status) return sendData(res, farm)

  if (status === 'archived') return sendData(res, await archiveFarm(req))
  return sendData(res, await prisma.farm.update({
    where: { id: farm.id },
    data: { status: 'active', archivedAt: null, archivedBy: null },
  }))
}

export async function deleteFarm(req, res) {
  const farm = await prisma.farm.findUnique({ where: { id: req.params.farmId } })
  if (!farm) throw createHttpError(404, 'Không tìm thấy trang trại.')
  if (farm.status !== 'archived') await archiveFarm(req)
  return res.status(204).end()
}
