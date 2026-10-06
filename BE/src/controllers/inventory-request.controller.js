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
        area: { select: { id: true, code: true, name: true } },
        requester: { select: { id: true, displayName: true, email: true } },
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
  let input
  try { input = normalizeInventoryRequestInput(req.body) }
  catch (error) { throw createHttpError(400, error.message) }

  const farmId = req.params.farmId
  const areaId = req.membership.role === 'area_manager' ? req.membership.areaId : input.areaId
  if (req.membership.role === 'area_manager' && !areaId) throw createHttpError(403, 'Area Manager chÆ°a Ä‘Æ°á»£c gÃ¡n khu vá»±c.')
  const [supply, area] = await Promise.all([
    prisma.inventorySupply.findFirst({ where: { id: input.supplyId, farmId }, select: { id: true } }),
    areaId ? prisma.area.findFirst({ where: { id: areaId, farmId, status: 'active' }, select: { id: true } }) : null,
  ])
  if (!supply) throw createHttpError(404, 'Váº­t tÆ° khÃ´ng tá»“n táº¡i trong trang tráº¡i nÃ y.')
  if (areaId && !area) throw createHttpError(404, 'Khu vá»±c khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ ngÆ°ng hoáº¡t Ä‘á»™ng trong trang tráº¡i nÃ y.')

  const request = await prisma.inventorySupplyRequest.create({
    data: {
      farmId,
      supplyId: supply.id,
      areaId: area?.id || null,
      requestedBy: req.auth.id,
      quantity: new Prisma.Decimal(String(input.quantity)),
      notes: input.notes,
    },
    include: {
      supply: { select: { id: true, name: true, category: true, unit: true } },
      area: { select: { id: true, code: true, name: true } },
      requester: { select: { id: true, displayName: true, email: true } },
    },
  })
  return sendData(res, serialize(request), 201)
}
