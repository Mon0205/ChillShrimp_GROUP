import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

const AREA_STATUSES = ['active', 'inactive']
const normalizeCode = (value) => value?.trim().toUpperCase()
const validCode = (value) => /^[A-Z0-9][A-Z0-9_-]{1,29}$/.test(value || '')

async function findArea(farmId, areaId) {
  const area = await prisma.area.findFirst({ where: { id: areaId, farmId } })
  if (!area) throw createHttpError(404, 'Không tìm thấy khu vực trong trang trại.')
  return area
}

export async function listAreas(req, res) {
  const includeInactive = req.query.includeInactive === 'true'
  if (req.query.includeInactive !== undefined && !['true', 'false'].includes(req.query.includeInactive)) {
    throw createHttpError(400, 'Tham số includeInactive không hợp lệ.')
  }
  if (includeInactive && req.membership.role !== 'owner') {
    throw createHttpError(403, 'Chỉ Owner được xem khu vực đã ngừng hoạt động.')
  }

  const areas = await prisma.area.findMany({
    where: {
      farmId: req.params.farmId,
      ...(includeInactive ? {} : { status: 'active' }),
      ...(req.membership.role === 'area_manager' ? { id: req.membership.areaId } : {}),
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  })
  return sendData(res, areas)
}

export async function createArea(req, res) {
  const code = normalizeCode(req.body.code)
  const name = req.body.name?.trim()
  if (!validCode(code)) throw createHttpError(400, 'Mã khu vực phải có 2-30 ký tự hợp lệ.')
  if (!name || name.length > 120) throw createHttpError(400, 'Tên khu vực phải từ 1 đến 120 ký tự.')
  try {
    return sendData(res, await prisma.area.create({ data: { farmId: req.params.farmId, code, name } }), 201)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw createHttpError(409, 'Mã khu vực đã tồn tại trong trại.')
    throw error
  }
}

export async function updateArea(req, res) {
  const existing = await findArea(req.params.farmId, req.params.areaId)
  const data = {}

  if (Object.prototype.hasOwnProperty.call(req.body, 'code')) {
    const code = normalizeCode(req.body.code)
    if (!validCode(code)) throw createHttpError(400, 'Mã khu vực phải có 2-30 ký tự hợp lệ.')
    data.code = code
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
    if (!name || name.length > 120) throw createHttpError(400, 'Tên khu vực phải từ 1 đến 120 ký tự.')
    data.name = name
  }
  if (!Object.keys(data).length) throw createHttpError(400, 'Không có thông tin khu vực cần cập nhật.')

  try {
    return sendData(res, await prisma.area.update({ where: { id: existing.id }, data }))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw createHttpError(409, 'Mã khu vực đã tồn tại trong trại.')
    }
    throw error
  }
}

export async function updateAreaStatus(req, res) {
  const status = req.body.status
  if (!AREA_STATUSES.includes(status)) throw createHttpError(400, 'Trạng thái khu vực không hợp lệ.')
  const existing = await findArea(req.params.farmId, req.params.areaId)
  if (existing.status === status) return sendData(res, existing)

  if (status === 'inactive') {
    const [activeMembers, pendingInvitations, operationalPondsTanks] = await Promise.all([
      prisma.farmMember.count({ where: { farmId: req.params.farmId, areaId: existing.id, status: 'active' } }),
      prisma.farmInvitation.count({ where: { farmId: req.params.farmId, areaId: existing.id, status: 'pending' } }),
      prisma.pondTank.count({ where: { farmId: req.params.farmId, areaId: existing.id, deletedAt: null, status: { not: 'inactive' } } }),
    ])
    if (activeMembers || pendingInvitations || operationalPondsTanks) {
      throw createHttpError(
        409,
        `Không thể ngừng khu vực: còn ${activeMembers} thành viên hoạt động, ${pendingInvitations} lời mời đang chờ và ${operationalPondsTanks} ao/bể chưa ngừng sử dụng.`,
      )
    }
  }

  return sendData(res, await prisma.area.update({ where: { id: existing.id }, data: { status } }))
}

export async function deleteArea(req, res) {
  const existing = await findArea(req.params.farmId, req.params.areaId)
  if (existing.status !== 'inactive') {
    throw createHttpError(409, 'Chỉ được xóa khu vực đã ngừng hoạt động.')
  }

  const [members, invitations, pondsTanks] = await Promise.all([
    prisma.farmMember.count({ where: { farmId: req.params.farmId, areaId: existing.id } }),
    prisma.farmInvitation.count({ where: { farmId: req.params.farmId, areaId: existing.id } }),
    prisma.pondTank.count({ where: { farmId: req.params.farmId, areaId: existing.id } }),
  ])
  if (members || invitations || pondsTanks) {
    throw createHttpError(
      409,
      `Không thể xóa khu vực vì còn liên kết với ${members} thành viên, ${invitations} lời mời và ${pondsTanks} ao/bể. Hãy giữ khu vực ở trạng thái ngừng hoạt động để bảo toàn lịch sử.`,
    )
  }

  try {
    await prisma.area.delete({ where: { id: existing.id } })
    return res.status(204).end()
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw createHttpError(409, 'Khu vực đang được dữ liệu khác sử dụng nên không thể xóa.')
    }
    throw error
  }
}
