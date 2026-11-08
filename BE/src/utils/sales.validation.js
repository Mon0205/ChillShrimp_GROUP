import { Prisma } from '@prisma/client'
import { createHttpError } from './http.js'
export const statuses = ['draft', 'confirmed', 'partially_delivered', 'delivered', 'completed', 'cancelled']
export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw createHttpError(400, 'Mã định danh không hợp lệ.')
  return value.toLowerCase()
}
export function fields(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw createHttpError(400, 'Dữ liệu hoặc trường không được hỗ trợ.')
}
export function text(value, max = 4000, required = false) {
  if ((value === null || value === undefined) && !required) return null
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw createHttpError(400, 'Nội dung không hợp lệ hoặc quá dài.')
  return value.trim() || null
}
function quantity(value) {
  if (!Number.isInteger(value) || value <= 0 || value > 2147483647) throw createHttpError(400, 'Số lượng phải là số nguyên dương.')
  return value
}
function money(value, positive = false) {
  if (typeof value !== 'string' || !/^\d{1,16}(\.\d{1,2})?$/.test(value)) throw createHttpError(400, 'Tiền phải là chuỗi số, tối đa 2 chữ số thập phân.')
  const result = new Prisma.Decimal(value)
  if (positive && !result.greaterThan(0)) throw createHttpError(400, 'Số tiền phải lớn hơn 0.')
  return result
}
function items(value, key, map) {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw createHttpError(400, 'Cần 1 đến 100 dòng hàng.')
  const result = value.map(item => { fields(item, key === 'batchId' ? [key, 'quantity', 'unitPrice'] : [key, 'quantity']); return { [key]: uuid(item[key]), quantity: quantity(item.quantity), ...map(item) } })
  if (new Set(result.map(item => item[key])).size !== result.length) throw createHttpError(400, 'Dòng hàng bị trùng.')
  return result
}
export function normalizeCustomer(body, partial = false) {
  fields(body, ['name', 'phone', 'address'])
  const result = {}
  for (const [key, max] of [['name',150],['phone',30],['address',4000]]) if (Object.hasOwn(body,key)) result[key] = text(body[key], max, key === 'name')
  if ((!partial && !result.name) || !Object.keys(result).length) throw createHttpError(400, 'Tên khách hàng là bắt buộc.')
  return result
}
export function normalizeOrder(body) {
  fields(body, ['customerId', 'expectedDeliveryDate', 'notes', 'items'])
  let date = null
  if (body.expectedDeliveryDate !== null && body.expectedDeliveryDate !== undefined) {
    const raw = body.expectedDeliveryDate
    if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw createHttpError(400, 'Ngày phải theo định dạng YYYY-MM-DD.')
    date = new Date(`${raw}T00:00:00Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== raw) throw createHttpError(400, 'Ngày không hợp lệ.')
  }
  return { customerId: uuid(body.customerId), expectedDeliveryDate: date, notes: text(body.notes), items: items(body.items, 'batchId', item => ({ unitPrice: money(item.unitPrice) })) }
}
export function normalizeDelivery(body) {
  fields(body, ['idempotencyKey', 'items', 'notes'])
  return { idempotencyKey: uuid(body.idempotencyKey), notes: text(body.notes), items: items(body.items, 'orderItemId', () => ({})).sort((a,b) => a.orderItemId.localeCompare(b.orderItemId)) }
}
export function normalizePayment(body) {
  fields(body, ['idempotencyKey', 'amount', 'method', 'notes'])
  if (!['cash','bank_transfer'].includes(body.method)) throw createHttpError(400, 'Phương thức thanh toán không hợp lệ.')
  return { idempotencyKey: uuid(body.idempotencyKey), amount: money(body.amount, true), method: body.method, notes: text(body.notes) }
}
export function pagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page), limit = query.limit === undefined ? 50 : Number(query.limit)
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100 || (!Number.isSafeInteger((page-1)*limit) || (page-1)*limit > 2147483647)) throw createHttpError(400, 'page/limit không hợp lệ.')
  return { page, limit, skip: (page-1)*limit }
}
