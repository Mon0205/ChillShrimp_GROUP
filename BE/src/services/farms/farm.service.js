import { isSystemAdmin } from '../auth/account-access.service.js'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'

const normalizeCode = (value) => value?.trim().toUpperCase()
const validCode = (value) => /^[A-Z0-9][A-Z0-9_-]{1,29}$/.test(value || '')
const FARM_STATUSES = ['active', 'inactive', 'archived']

export async function listFarms(context) {
  const includeArchived = context.filters.includeArchived === 'true'
  const includeInactive = context.filters.includeInactive === 'true'
  if (context.filters.includeInactive !== undefined && !['true', 'false'].includes(context.filters.includeInactive)) {
    throw createHttpError(400, 'Tham số includeInactive không hợp lệ.')
  }
  if (context.filters.includeArchived !== undefined && !['true', 'false'].includes(context.filters.includeArchived)) {
    throw createHttpError(400, 'Tham số includeArchived không hợp lệ.')
  }
  if (isSystemAdmin(context.actor)) {
    const statuses = includeInactive ? FARM_STATUSES : includeArchived ? ['active', 'archived'] : ['active']
    const farms = await prisma.farm.findMany({ where: { status: { in: statuses } }, orderBy: { createdAt: 'desc' } })
    const areas = farms.length ? await prisma.area.findMany({
      where: { farmId: { in: farms.map(farm => farm.id) }, status: 'active' },
      select: { id: true, farmId: true, code: true, name: true }, orderBy: { name: 'asc' },
    }) : []
    return farms.map(farm => ({ ...farm, role: 'OWNER', area: null, areas: areas.filter(area => area.farmId === farm.id) }))
  }
  const roles = context.filters.manageable === 'true' ? ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER'] : undefined
  const memberships = await prisma.farmMember.findMany({
    where: {
      userId: context.actor.id,
      status: 'active',
      ...(roles ? { role: { in: roles } } : {}),
      ...(includeInactive
        ? { OR: [{ farm: { status: { in: ['active', 'inactive'] } } }, { role: { in: ['OWNER', 'FARM_MANAGER'] }, farm: { status: 'archived' } }] }
        : includeArchived
        ? { OR: [{ farm: { status: 'active' } }, { role: { in: ['OWNER', 'FARM_MANAGER'] }, farm: { status: 'archived' } }] }
        : { farm: { status: 'active' } }),
    },
    include: { farm: true, area: { select: { id: true, code: true, name: true } } }, orderBy: { farm: { createdAt: 'desc' } },
  })
  const ownerFarmIds = memberships.filter(member => ['OWNER', 'FARM_MANAGER'].includes(member.role)).map(member => member.farmId)
  const managerAreaIds = memberships.filter(member => member.role === 'AREA_MANAGER' && member.areaId).map(member => member.areaId)
  const areas = ownerFarmIds.length || managerAreaIds.length ? await prisma.area.findMany({
    where: { OR: [{ farmId: { in: ownerFarmIds } }, { id: { in: managerAreaIds } }] },
    select: { id: true, farmId: true, code: true, name: true },
    orderBy: { name: 'asc' },
  }) : []
  return memberships.map(({ farm, role, area }) => ({
    ...farm, role, area, areas: areas.filter(item => item.farmId === farm.id),
  }))
}

export async function createFarm(context) {
  const code = normalizeCode(context.input.code)
  const name = context.input.name?.trim()
  if (!validCode(code)) throw createHttpError(400, 'Mã trại phải có 2-30 ký tự, chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.')
  if (!name || name.length > 120) throw createHttpError(400, 'Tên trại phải từ 1 đến 120 ký tự.')
  try {
    const farm = await prisma.$transaction(async (tx) => {
      const created = await tx.farm.create({ data: { code, name, address: context.input.address?.trim() || null, createdBy: context.actor.id } })
      await tx.farmMember.create({ data: { farmId: created.id, userId: context.actor.id, role: 'OWNER' } })
      return created
    })
    return farm
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã trại đã tồn tại. Vui lòng chọn mã khác.')
    throw error
  }
}

export async function updateFarm(context) {
  const data = {}
  if (typeof context.input.code === 'string') {
    const code = normalizeCode(context.input.code)
    if (!validCode(code)) throw createHttpError(400, 'Mã trại phải có 2-30 ký tự, chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.')
    data.code = code
  }
  if (typeof context.input.name === 'string') {
    const name = context.input.name.trim()
    if (!name || name.length > 120) throw createHttpError(400, 'Tên trại phải từ 1 đến 120 ký tự.')
    data.name = name
  }
  if (typeof context.input.address === 'string' || context.input.address === null) data.address = context.input.address?.trim() || null
  if (context.input.status !== undefined) {
    if (!['active', 'inactive'].includes(context.input.status)) throw createHttpError(400, 'Trạng thái trang trại không hợp lệ.')
    data.status = context.input.status
  }
  try {
    return await prisma.farm.update({ where: { id: context.farmId }, data })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã trại đã tồn tại. Vui lòng chọn mã khác.')
    throw error
  }
}

async function archiveFarm(context) {
  const farmId = context.farmId
  const [activeAreas, operationalPondsTanks, pendingInvitations, activeStaff] = await Promise.all([
    prisma.area.count({ where: { farmId, status: 'active' } }),
    prisma.pondTank.count({ where: { farmId, deletedAt: null, status: { not: 'inactive' } } }),
    prisma.farmInvitation.count({ where: { farmId, status: 'pending' } }),
    prisma.farmMember.count({ where: { farmId, status: 'active', role: { not: 'OWNER' } } }),
  ])
  if (activeAreas || operationalPondsTanks || pendingInvitations || activeStaff) {
    throw createHttpError(
      409,
      `Không thể lưu trữ trang trại: còn ${activeAreas} khu vực hoạt động, ${operationalPondsTanks} ao/bể chưa ngừng sử dụng, ${pendingInvitations} lời mời đang chờ và ${activeStaff} nhân viên đang hoạt động.`,
    )
  }
  return prisma.farm.update({
    where: { id: farmId },
    data: { status: 'archived' },
  })
}

export async function updateFarmStatus(context) {
  const status = context.input.status
  if (!FARM_STATUSES.includes(status)) throw createHttpError(400, 'Trạng thái trang trại không hợp lệ.')
  const farm = await prisma.farm.findUnique({ where: { id: context.farmId } })
  if (!farm) throw createHttpError(404, 'Không tìm thấy trang trại.')
  if (farm.status === status) return farm

  if (status === 'archived') return await archiveFarm(context)
  return await prisma.farm.update({
    where: { id: farm.id },
    data: { status },
  })
}

export async function deleteFarm(context) {
  const farm = await prisma.farm.findUnique({ where: { id: context.farmId } })
  if (!farm) throw createHttpError(404, 'Không tìm thấy trang trại.')
  if (farm.status !== 'archived') await archiveFarm(context)
  return undefined
}
