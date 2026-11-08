import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'

const AREA_STATUSES = ['active', 'inactive']
const normalizeCode = (value) => value?.trim().toUpperCase()
const validCode = (value) => /^[A-Z0-9][A-Z0-9_-]{1,29}$/.test(value || '')

async function findArea(farmId, areaId) {
  const area = await prisma.area.findFirst({ where: { id: areaId, farmId } })
  if (!area) throw createHttpError(404, 'Không tìm thấy khu vực trong trang trại.')
  return area
}

export async function listAreas(context) {
  const includeInactive = context.filters.includeInactive === 'true'
  if (context.filters.includeInactive !== undefined && !['true', 'false'].includes(context.filters.includeInactive)) {
    throw createHttpError(400, 'Tham số includeInactive không hợp lệ.')
  }
  if (includeInactive && !['owner', 'farm_manager'].includes(context.membership.role)) {
    throw createHttpError(403, 'Chỉ Chủ trại hoặc Quản lý trại được xem khu vực đã ngừng hoạt động.')
  }

  const areas = await prisma.area.findMany({
    where: {
      farmId: context.farmId,
      ...(includeInactive ? {} : { status: 'active' }),
      ...(context.membership.role === 'area_manager' ? { id: context.membership.areaId } : {}),
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  })
  return areas
}

export async function createArea(context) {
  const code = normalizeCode(context.input.code)
  const name = context.input.name?.trim()
  if (!validCode(code)) throw createHttpError(400, 'Mã khu vực phải có 2-30 ký tự hợp lệ.')
  if (!name || name.length > 120) throw createHttpError(400, 'Tên khu vực phải từ 1 đến 120 ký tự.')
  try {
    return await prisma.area.create({ data: { farmId: context.farmId, code, name } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã khu vực đã tồn tại trong trại.')
    throw error
  }
}

export async function updateArea(context) {
  const existing = await findArea(context.farmId, context.areaId)
  const data = {}

  if (Object.prototype.hasOwnProperty.call(context.input, 'code')) {
    const code = normalizeCode(context.input.code)
    if (!validCode(code)) throw createHttpError(400, 'Mã khu vực phải có 2-30 ký tự hợp lệ.')
    data.code = code
  }
  if (Object.prototype.hasOwnProperty.call(context.input, 'name')) {
    const name = typeof context.input.name === 'string' ? context.input.name.trim() : ''
    if (!name || name.length > 120) throw createHttpError(400, 'Tên khu vực phải từ 1 đến 120 ký tự.')
    data.name = name
  }
  if (!Object.keys(data).length) throw createHttpError(400, 'Không có thông tin khu vực cần cập nhật.')

  try {
    return await prisma.area.update({ where: { id: existing.id }, data })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw createHttpError(409, 'Mã khu vực đã tồn tại trong trại.')
    }
    throw error
  }
}

export async function updateAreaStatus(context) {
  const status = context.input.status
  if (!AREA_STATUSES.includes(status)) throw createHttpError(400, 'Trạng thái khu vực không hợp lệ.')
  const existing = await findArea(context.farmId, context.areaId)
  if (existing.status === status) return existing

  if (status === 'inactive') {
    const [activeMembers, pendingInvitations, operationalPondsTanks] = await Promise.all([
      prisma.farmMember.count({ where: { farmId: context.farmId, areaId: existing.id, status: 'active' } }),
      prisma.farmInvitation.count({ where: { farmId: context.farmId, areaId: existing.id, status: 'pending' } }),
      prisma.pondTank.count({ where: { farmId: context.farmId, areaId: existing.id, deletedAt: null, status: { not: 'inactive' } } }),
    ])
    if (activeMembers || pendingInvitations || operationalPondsTanks) {
      throw createHttpError(
        409,
        `Không thể ngừng khu vực: còn ${activeMembers} thành viên hoạt động, ${pendingInvitations} lời mời đang chờ và ${operationalPondsTanks} ao/bể chưa ngừng sử dụng.`,
      )
    }
  }

  return await prisma.area.update({ where: { id: existing.id }, data: { status } })
}

export async function deleteArea(context) {
  const existing = await findArea(context.farmId, context.areaId)
  if (existing.status !== 'inactive') {
    throw createHttpError(409, 'Chỉ được xóa khu vực đã ngừng hoạt động.')
  }

  const [members, invitations, pondsTanks] = await Promise.all([
    prisma.farmMember.count({ where: { farmId: context.farmId, areaId: existing.id } }),
    prisma.farmInvitation.count({ where: { farmId: context.farmId, areaId: existing.id } }),
    prisma.pondTank.count({ where: { farmId: context.farmId, areaId: existing.id } }),
  ])
  if (members || invitations || pondsTanks) {
    throw createHttpError(
      409,
      `Không thể xóa khu vực vì còn liên kết với ${members} thành viên, ${invitations} lời mời và ${pondsTanks} ao/bể. Hãy giữ khu vực ở trạng thái ngừng hoạt động để bảo toàn lịch sử.`,
    )
  }

  try {
    await prisma.area.delete({ where: { id: existing.id } })
    return undefined
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw createHttpError(409, 'Khu vực đang được dữ liệu khác sử dụng nên không thể xóa.')
    }
    throw error
  }
}
