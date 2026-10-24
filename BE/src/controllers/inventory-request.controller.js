import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'
import { normalizeInventoryRequestInput } from '../utils/inventory-request.validation.js'

function pagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page)
  const limit = query.limit === undefined ? 50 : Number(query.limit)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw createHttpError(400, 'Tham sá»‘ page/limit khÃ´ng há»£p lá»‡.')
  return { page, limit, skip: (page - 1) * limit }
}

function serialize(item) {
  return { ...item, quantity: item.quantity.toString() }
}

export async function listInventorySupplyRequests(req, res) {
  const { page, limit, skip } = pagination(req.query)
  const status = req.query.status || ''
  if (status && !['pending', 'fulfilled', 'rejected', 'cancelled'].includes(status)) throw createHttpError(400, 'Tráº¡ng thÃ¡i yÃªu cáº§u khÃ´ng há»£p lá»‡.')
  const where = { farmId: req.params.farmId, ...(status ? { status } : {}) }
  if (req.membership.role === 'area_manager') {
    if (!req.membership.areaId) throw createHttpError(403, 'Area Manager chÆ°a Ä‘Æ°á»£c gÃ¡n khu vá»±c.')
    where.areaId = req.membership.areaId
  }
  const [items, total] = await prisma.$transaction([
    prisma.inventorySupplyRequest.findMany({
      where,
      include: {
        supply: { select: { id: true, name: true, category: true, unit: true } },
        tank: { select: { id: true, code: true, name: true } },
        area: { select: { id: true, code: true, name: true } },
        requester: { select: { id: true, displayName: true, email: true } },
      processor: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.inventorySupplyRequest.count({ where }),
  ])
  return sendData(res, { items: items.map(serialize), pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } })
}

export async function createInventorySupplyRequest(req, res) {
  if (req.membership.role !== 'area_manager') throw createHttpError(403, 'Chỉ quản lý khu vực được tạo yêu cầu cấp vật tư.')
  let input
  try { input = normalizeInventoryRequestInput(req.body) }
  catch (error) { throw createHttpError(400, error.message) }

  const farmId = req.params.farmId
  const areaId = req.membership.role === 'area_manager' ? req.membership.areaId : input.areaId
  if (req.membership.role === 'area_manager') {
    if (!areaId) throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
    if (input.areaId && input.areaId !== areaId) throw createHttpError(403, 'Chỉ được yêu cầu vật tư cho khu vực được phân công.')
  }
  if (!areaId) throw createHttpError(400, 'Bắt buộc chọn khu vực nhận vật tư.')
  const [supply, area, tank] = await Promise.all([
    prisma.inventorySupply.findFirst({ where: { id: input.supplyId, farmId }, select: { id: true } }),
    prisma.area.findFirst({ where: { id: areaId, farmId, status: 'active' }, select: { id: true } }),
    prisma.pondTank.findFirst({
      where: { id: input.tankId, farmId, areaId, deletedAt: null, status: { not: 'inactive' } },
      select: { id: true },
    }),
  ])
  if (!supply) throw createHttpError(404, 'Vật tư không tồn tại trong trang trại này.')
  if (!area) throw createHttpError(404, 'Khu vực không tồn tại hoặc đã ngừng hoạt động.')
  if (!tank) throw createHttpError(400, 'Ao/bể phải thuộc khu vực đã chọn, chưa xóa và chưa ngừng hoạt động.')

  const request = await prisma.inventorySupplyRequest.create({
    data: {
      farmId,
      supplyId: supply.id,
      areaId: area.id,
      tankId: tank.id,
      requestedBy: req.auth.id,
      quantity: new Prisma.Decimal(String(input.quantity)),
      notes: input.notes,
    },
    include: {
      supply: { select: { id: true, name: true, category: true, unit: true } },
      tank: { select: { id: true, code: true, name: true } },
      area: { select: { id: true, code: true, name: true } },
      requester: { select: { id: true, displayName: true, email: true } },
      processor: { select: { id: true, displayName: true, email: true } },
    },
  })
  return sendData(res, serialize(request), 201)
}

export async function approveInventorySupplyRequest(req, res) {
  if (!['owner', 'farm_manager', 'warehouse_staff'].includes(req.membership.role)) throw createHttpError(403, 'Chỉ chủ trại hoặc nhân viên kho được duyệt cấp vật tư.')
  const { farmId, requestId } = req.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId || '')) throw createHttpError(400, 'Mã yêu cầu không hợp lệ.')
  const item = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM supply_requests WHERE id = ${requestId}::uuid AND farm_id = ${farmId}::uuid FOR UPDATE`
    const request = await tx.inventorySupplyRequest.findFirst({ where: { id: requestId, farmId } })
    if (!request) throw createHttpError(404, 'Không tìm thấy yêu cầu trong trang trại.')
    if (request.status !== 'pending') throw createHttpError(409, 'Yêu cầu đã được xử lý; không thể duyệt lại.')
    if (!request.tankId || !request.areaId) throw createHttpError(409, 'Yêu cầu chưa xác định ao/bể nhận vật tư. Vui lòng tạo lại yêu cầu có ao/bể.')
    await tx.$queryRaw`SELECT id FROM areas WHERE id = ${request.areaId}::uuid AND farm_id = ${farmId}::uuid FOR SHARE`
    await tx.$queryRaw`SELECT id FROM ponds_tanks WHERE id = ${request.tankId}::uuid AND farm_id = ${farmId}::uuid FOR SHARE`
    const tank = await tx.pondTank.findFirst({
      where: {
        id: request.tankId, farmId, areaId: request.areaId,
        deletedAt: null, status: { not: 'inactive' }, area: { is: { status: 'active' } },
      },
      select: { id: true },
    })
    if (!tank) throw createHttpError(409, 'Ao/bể không còn thuộc khu vực yêu cầu hoặc đã ngừng hoạt động. Vui lòng tạo lại yêu cầu.')
    await tx.$queryRaw`SELECT id FROM inventory_supplies WHERE id = ${request.supplyId}::uuid AND farm_id = ${farmId}::uuid FOR UPDATE`
    const supply = await tx.inventorySupply.findFirst({ where: { id: request.supplyId, farmId } })
    if (!supply) throw createHttpError(404, 'Không tìm thấy vật tư trong trang trại.')
    if (supply.quantity.lessThan(request.quantity)) throw createHttpError(409, 'Tồn kho không đủ để cấp vật tư theo yêu cầu.')
    const stock = await tx.inventorySupply.updateMany({
      where: { id: supply.id, farmId, quantity: { gte: request.quantity } },
      data: { quantity: { decrement: request.quantity } },
    })
    if (!stock.count) throw createHttpError(409, 'Tồn kho vừa thay đổi; tải lại và thử lại.')
    await tx.inventoryTransaction.create({ data: {
      supplyId: supply.id,
      supplyRequestId: request.id,
      createdBy: req.auth.id,
      transactionType: 'usage',
      quantity: request.quantity,
      unitPrice: supply.unitPrice,
      transactionDate: new Date(),
      notes: request.notes,
    } })
    return tx.inventorySupplyRequest.update({
      where: { id: request.id }, data: { status: 'fulfilled', processedBy: req.auth.id, processedAt: new Date(), rejectionReason: null },
      include: {
        supply: { select: { id: true, name: true, category: true, unit: true } },
        tank: { select: { id: true, code: true, name: true } },
        area: { select: { id: true, code: true, name: true } },
        requester: { select: { id: true, displayName: true, email: true } },
      processor: { select: { id: true, displayName: true, email: true } },
      },
    })
  })
  return sendData(res, serialize(item))
}

export async function rejectInventorySupplyRequest(req, res) {
  if (!['owner', 'farm_manager', 'warehouse_staff'].includes(req.membership.role)) throw createHttpError(403, 'Chỉ chủ trại hoặc nhân viên kho được xử lý yêu cầu cấp vật tư.')
  const { farmId, requestId } = req.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId || '')) throw createHttpError(400, 'Mã yêu cầu không hợp lệ.')
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).some(key => key !== 'reason')) throw createHttpError(400, 'Dữ liệu từ chối không hợp lệ.')
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : ''
  if (!reason || reason.length > 4000) throw createHttpError(400, 'Lý do từ chối là bắt buộc và tối đa 4.000 ký tự.')
  const item = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM supply_requests WHERE id = ${requestId}::uuid AND farm_id = ${farmId}::uuid FOR UPDATE`
    const request = await tx.inventorySupplyRequest.findFirst({ where: { id: requestId, farmId } })
    if (!request) throw createHttpError(404, 'Không tìm thấy yêu cầu trong trang trại.')
    if (request.status !== 'pending') throw createHttpError(409, 'Yêu cầu đã được xử lý; không thể từ chối lại.')
    return tx.inventorySupplyRequest.update({
      where: { id: request.id },
      data: { status: 'rejected', rejectionReason: reason, processedBy: req.auth.id, processedAt: new Date() },
      include: {
        supply: { select: { id: true, name: true, category: true, unit: true } },
        tank: { select: { id: true, code: true, name: true } },
        area: { select: { id: true, code: true, name: true } },
        requester: { select: { id: true, displayName: true, email: true } },
      processor: { select: { id: true, displayName: true, email: true } },
      },
    })
  })
  return sendData(res, serialize(item))
}
