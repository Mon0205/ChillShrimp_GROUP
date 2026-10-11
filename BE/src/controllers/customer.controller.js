import { prisma } from '../config/prisma.js'
import { createHttpError, sendData } from '../utils/http.js'

export const CUSTOMER_TYPES = ['farm', 'household', 'cooperative', 'other']
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function normalizeCustomerInput(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw createHttpError(400, 'Dữ liệu khách hàng không hợp lệ.')
  const limits = { name: 150, phone: 20, address: 4000, notes: 4000 }
  const data = {}
  for (const key of Object.keys(body)) {
    if (key === 'customerType') {
      if (!CUSTOMER_TYPES.includes(body[key])) throw createHttpError(400, 'Loại khách hàng không hợp lệ.')
      data[key] = body[key]
    } else if (Object.hasOwn(limits, key)) {
      const value = body[key]
      if (value !== null && typeof value !== 'string') throw createHttpError(400, `Trường ${key} phải là chuỗi.`)
      const text = value?.trim() || null
      if ((key === 'name' && !text) || (text && text.length > limits[key])) throw createHttpError(400, `Trường ${key} trống hoặc vượt giới hạn ${limits[key]} ký tự.`)
      if (key === 'phone' && text && (!/^[+()\d.\-\s]+$/.test(text) || !/\d/.test(text))) throw createHttpError(400, 'Số điện thoại không hợp lệ.')
      data[key] = text
    } else throw createHttpError(400, `Trường không được hỗ trợ: ${key}.`)
  }
  if ((!partial && (!data.name || !data.customerType)) || !Object.keys(data).length) throw createHttpError(400, 'Cần tên và loại khách hàng hoặc trường cập nhật hợp lệ.')
  return data
}
function customerWhere(req) {
  if (!uuid.test(req.params.customerId || '')) throw createHttpError(400, 'Mã khách hàng không hợp lệ.')
  return { id: req.params.customerId, farmId: req.params.farmId, deletedAt: null }
}
export async function listCustomers(req, res) {
  const { q = '', customerType = '', page = '1', limit = '10' } = req.query
  if (typeof q !== 'string' || q.length > 150 || typeof customerType !== 'string' || (customerType && !CUSTOMER_TYPES.includes(customerType))) throw createHttpError(400, 'Bộ lọc khách hàng không hợp lệ.')
  const p = Number(page), n = Number(limit)
  if (typeof page !== 'string' || typeof limit !== 'string' || !Number.isSafeInteger(p) || p < 1 || !Number.isInteger(n) || n < 1 || n > 100 || !Number.isSafeInteger((p - 1) * n)) throw createHttpError(400, 'Phân trang không hợp lệ.')
  const where = { farmId: req.params.farmId, deletedAt: null, ...(customerType ? { customerType } : {}), ...(q.trim() ? { OR: [{ name: { contains: q.trim(), mode: 'insensitive' } }, { phone: { contains: q.trim(), mode: 'insensitive' } }] } : {}) }
  const [items, total] = await prisma.$transaction([
    prisma.customer.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (p - 1) * n, take: n }),
    prisma.customer.count({ where }),
  ])
  return sendData(res, { items, pagination: { page: p, limit: n, total, pageCount: Math.ceil(total / n) } })
}
export async function getCustomer(req, res) {
  const item = await prisma.customer.findFirst({ where: customerWhere(req) })
  if (!item) throw createHttpError(404, 'Không tìm thấy khách hàng trong trại.')
  return sendData(res, item)
}
export async function createCustomer(req, res) {
  return sendData(res, await prisma.customer.create({ data: { ...normalizeCustomerInput(req.body), farmId: req.params.farmId } }), 201)
}
export async function updateCustomer(req, res) {
  const where = customerWhere(req), data = normalizeCustomerInput(req.body, true)
  const result = await prisma.customer.updateMany({ where, data })
  if (!result.count) throw createHttpError(404, 'Không tìm thấy khách hàng trong trại.')
  return getCustomer(req, res)
}
export async function deleteCustomer(req, res) {
  const result = await prisma.customer.updateMany({ where: customerWhere(req), data: { deletedAt: new Date() } })
  if (!result.count) throw createHttpError(404, 'Không tìm thấy khách hàng trong trại.')
  return res.status(204).end()
}
