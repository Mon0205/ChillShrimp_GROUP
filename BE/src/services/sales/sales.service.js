import { isDeepStrictEqual } from 'node:util'
import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { createHttpError } from '../../utils/http.js'
import { uuid, text, fields, statuses, pagination, normalizeCustomer, normalizeOrder, normalizeDelivery, normalizePayment } from '../../utils/sales.validation.js'

const actor = { select: { id: true, displayName: true, email: true } }
const include = {
  customer: true, creator: actor, confirmer: actor, canceller: actor,
  items: { include: { batch: { include: { tank: true } } }, orderBy: { id: 'asc' } },
  deliveries: { include: { items: true, creator: actor }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
  payments: { include: { creator: actor }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
}
const decimal = value => new Prisma.Decimal(value)
export function serializeOrder(order) {
  const paid = (order.payments || []).reduce((sum, payment) => sum.plus(payment.amount), decimal(0))
  const total = decimal(order.totalAmount)
  return { ...order, totalAmount: total.toString(), paidAmount: paid.toString(), outstandingAmount: total.minus(paid).toString(), paymentStatus: paid.gte(total) ? 'paid' : paid.gt(0) ? 'partial' : 'unpaid',
    items: order.items.map(item => ({ ...item, unitPrice: item.unitPrice.toString(), lineTotal: item.lineTotal.toString() })),
    payments: (order.payments || []).map(({ requestPayload, ...payment }) => ({ ...payment, amount: payment.amount.toString() })),
    deliveries: (order.deliveries || []).map(({ requestPayload, ...delivery }) => delivery),
  }
}
function role(operation, manager = false) {
  if (!['owner','farm_manager', ...(manager ? [] : ['area_manager'])].includes(operation.membership.role)) throw createHttpError(403, 'Bạn không có quyền thực hiện thao tác bán giống này.')
  if (operation.membership.role === 'area_manager' && !operation.membership.areaId) throw createHttpError(403, 'Tài khoản chưa được gán khu vực.')
}
function tankScope(operation) { return { farmId: operation.farmId, ...(operation.membership.role === 'area_manager' ? { areaId: operation.membership.areaId } : {}) } }
function orderScope(operation) {
  return { farmId: operation.farmId, ...(operation.membership.role === 'area_manager' ? { items: { every: { batch: { tank: { areaId: operation.membership.areaId, farmId: operation.farmId } } } } } : {}) }
}
function search(operation) { return text(operation.filters.q,150) }
async function pageResult(operation, model, where, extras = {}, map = value => value) {
  const { page,limit,skip } = pagination(operation.filters)
  const [items,total] = await prisma.$transaction([model.findMany({ where, ...extras, skip,take:limit }), model.count({where})])
  return { items: items.map(map), pagination: {page,limit,total,pageCount:Math.ceil(total/limit)} }
}
async function findOrder(tx,operation) {
  const order = await tx.salesOrder.findFirst({where:{id:uuid(operation.orderId),...orderScope(operation)},include})
  if (!order) throw createHttpError(404,'Không tìm thấy phiếu trong phạm vi được cấp quyền.')
  return order
}
async function lockOrder(tx,operation) {
  const id=uuid(operation.orderId), farmId=operation.farmId
  await tx.$queryRaw`SELECT id FROM sales_orders WHERE id = ${id}::uuid AND farm_id = ${farmId}::uuid FOR UPDATE`
  return findOrder(tx,operation)
}
// All sales mutations lock order, then areas, tanks and batches in sorted ID order.
async function lockBatches(tx,operation,batchIds) {
  const ids=[...new Set(batchIds)].sort()
  const initial=await tx.seedBatch.findMany({where:{id:{in:ids},tank:tankScope(operation)},include:{tank:true}})
  if(initial.length!==ids.length) throw createHttpError(400,'Lô giống không thuộc trại hoặc khu vực được cấp quyền.')
  for(const areaId of [...new Set(initial.map(b=>b.tank.areaId).filter(Boolean))].sort()) await tx.$queryRaw`SELECT id FROM areas WHERE id = ${areaId}::uuid FOR SHARE`
  for(const tankId of [...new Set(initial.map(b=>b.tankId))].sort()) await tx.$queryRaw`SELECT id FROM ponds_tanks WHERE id = ${tankId}::uuid FOR UPDATE`
  for(const id of ids) await tx.$queryRaw`SELECT id FROM seed_batches WHERE id = ${id}::uuid FOR UPDATE`
  const batches=await tx.seedBatch.findMany({where:{id:{in:ids},tank:tankScope(operation)},include:{tank:{include:{area:true}}}})
  if(batches.length!==ids.length || batches.some(batch => {
    const before = initial.find(item => item.id === batch.id)
    return batch.tankId !== before.tankId || batch.tank.areaId !== before.tank.areaId
  })) throw createHttpError(409,'Phạm vi lô giống vừa thay đổi.')
  return new Map(batches.map(batch=>[batch.id,batch]))
}
function saleable(batch) {
  if(batch.status!=='ready_for_sale'||batch.tank.deletedAt||batch.tank.status!=='active'||(batch.tank.areaId&&batch.tank.area?.status!=='active')) throw createHttpError(409,'Lô phải sẵn sàng bán, ao/bể và khu vực phải hoạt động.')
}
async function refreshStatus(tx,order) {
  const current=await tx.salesOrder.findUnique({where:{id:order.id},include})
  const all=current.items.every(item=>item.deliveredQuantity===item.quantity)
  const paid=current.payments.reduce((sum,payment)=>sum.plus(payment.amount),decimal(0))
  const status=all?(paid.gte(current.totalAmount)?'completed':'delivered'):current.items.some(item=>item.deliveredQuantity>0)?'partially_delivered':'confirmed'
  await tx.salesOrder.update({where:{id:current.id},data:{status}})
}
async function replyOrder(tx,operation) { return serializeOrder(await findOrder(tx,operation)) }
function payload(input) { return JSON.parse(JSON.stringify(input)) }
function samePayload(existing,input,orderId) {
  if(existing.orderId!==orderId||!isDeepStrictEqual(existing.requestPayload,payload(input))) throw createHttpError(409,'Khóa gửi lại đã được dùng với nội dung khác.')
}
async function transaction(fn) {
  try { return await prisma.$transaction(fn,{timeout:15000}) }
  catch(error) {
    if(error.code==='P2002') throw createHttpError(409,'Khóa giao dịch đã được sử dụng; tải lại và thử lại.')
    throw error
  }
}
export async function listCustomers(operation) {
  role(operation); const q=search(operation)
  return await pageResult(operation,prisma.customer,{farmId:operation.farmId,...(q?{OR:[{name:{contains:q,mode:'insensitive'}},{phone:{contains:q,mode:'insensitive'}}]}:{})},{orderBy:[{name:'asc'},{id:'asc'}]})
}
export async function createCustomer(operation) {
  role(operation)
  return await prisma.customer.create({data:{...normalizeCustomer(operation.input),farmId:operation.farmId}})
}
export async function updateCustomer(operation) {
  role(operation);const id=uuid(operation.customerId), data=normalizeCustomer(operation.input,true)
  const customer=await prisma.customer.findFirst({where:{id,farmId:operation.farmId}})
  if(!customer) throw createHttpError(404,'Không tìm thấy khách hàng trong trại.')
  return await prisma.customer.update({where:{id},data})
}
export async function listSalesBatches(operation) {
  role(operation);const q=search(operation)
  return await pageResult(operation,prisma.seedBatch,{status:'ready_for_sale',tank:{...tankScope(operation),status:'active',deletedAt:null,OR:[{areaId:null},{area:{is:{status:'active'}}}]},...(q?{batchCode:{contains:q,mode:'insensitive'}}:{})},{include:{tank:true},orderBy:[{batchCode:'asc'},{id:'asc'}]},b=>({...b,availableQuantity:b.currentEstimatedQuantity-b.reservedQuantity}))
}
export async function listSalesOrders(operation) {
  role(operation); const q=search(operation),status=operation.filters.status
  if(status&&!statuses.includes(status)) throw createHttpError(400,'Trạng thái phiếu không hợp lệ.')
  return await pageResult(operation,prisma.salesOrder,{...orderScope(operation),...(status?{status}:{}),...(q?{OR:[{orderCode:{contains:q,mode:'insensitive'}},{customerName:{contains:q,mode:'insensitive'}},{customerPhone:{contains:q,mode:'insensitive'}}]}:{})},{include,orderBy:[{createdAt:'desc'},{id:'desc'}]},serializeOrder)
}
export async function getSalesOrder(operation) {role(operation);return serializeOrder(await findOrder(prisma,operation))}
async function draftData(tx,operation,input) {
  const customer=await tx.customer.findFirst({where:{id:input.customerId,farmId:operation.farmId}})
  if(!customer) throw createHttpError(400,'Khách hàng không thuộc trại này.')
  const batches=await lockBatches(tx,operation,input.items.map(item=>item.batchId))
  for(const batch of batches.values()) saleable(batch)
  const items=input.items.map(item=>({...item,lineTotal:item.unitPrice.mul(item.quantity)}))
  const totalAmount=items.reduce((sum,item)=>sum.plus(item.lineTotal),decimal(0))
  if(totalAmount.greaterThan('9999999999999999.99')) throw createHttpError(400,'Tổng tiền vượt giới hạn cho phép.')
  const {items:unused,...data}=input
  return {...data,customerName:customer.name,customerPhone:customer.phone,deliveryAddress:customer.address,totalAmount,items:{create:items}}
}
export async function createSalesOrder(operation) {
  role(operation);const input=normalizeOrder(operation.input)
  const order=await transaction(async tx=>{
    const data=await draftData(tx,operation,input)
    return tx.salesOrder.create({data:{...data,farmId:operation.farmId,createdBy:operation.actor.id,orderCode:`BG-${randomUUID()}`},include})
  })
  return serializeOrder(order)
}
export async function updateSalesOrder(operation) {
  role(operation);const input=normalizeOrder(operation.input)
  const result=await transaction(async tx=>{
    const order=await lockOrder(tx,operation)
    if(order.status!=='draft') throw createHttpError(409,'Chỉ được sửa phiếu nháp.')
    const data=await draftData(tx,operation,input)
    await tx.salesOrderItem.deleteMany({where:{orderId:order.id}})
    await tx.salesOrder.update({where:{id:order.id},data})
    return replyOrder(tx,operation)
  })
  return result
}
export async function confirmSalesOrder(operation) {
  role(operation,true);fields(operation.input??{},[])
  const result=await transaction(async tx=>{
    const order=await lockOrder(tx,operation)
    if(order.status!=='draft') throw createHttpError(409,'Chỉ được duyệt phiếu nháp.')
    const batches=await lockBatches(tx,operation,order.items.map(item=>item.batchId))
    for(const item of order.items){
      const batch=batches.get(item.batchId);saleable(batch)
      if(batch.currentEstimatedQuantity-batch.reservedQuantity<item.quantity) throw createHttpError(409,'Lô không đủ số lượng khả dụng để giữ hàng.')
      await tx.seedBatch.update({where:{id:batch.id},data:{reservedQuantity:{increment:item.quantity}}})
    }
    await tx.salesOrder.update({where:{id:order.id},data:{status:'confirmed',confirmedBy:operation.actor.id,confirmedAt:new Date()}})
    return replyOrder(tx,operation)
  })
  return result
}
export async function cancelSalesOrder(operation) {
  role(operation);fields(operation.input,['reason']);const reason=text(operation.input.reason,4000,true)
  const result=await transaction(async tx=>{
    const order=await lockOrder(tx,operation)
    if(order.status==='confirmed') role(operation,true)
    if(!['draft','confirmed'].includes(order.status)||order.items.some(item=>item.deliveredQuantity>0)||order.payments.length) throw createHttpError(409,'Chỉ hủy phiếu chưa giao và chưa thu tiền; cần hoàn tiền nếu đã nhận cọc.')
    if(order.status==='confirmed') {
      await lockBatches(tx,operation,order.items.map(item=>item.batchId))
      for(const item of order.items) await tx.seedBatch.update({where:{id:item.batchId},data:{reservedQuantity:{decrement:item.quantity}}})
    }
    await tx.salesOrder.update({where:{id:order.id},data:{status:'cancelled',cancelledBy:operation.actor.id,cancelledAt:new Date(),cancellationReason:reason}})
    return replyOrder(tx,operation)
  })
  return result
}
export async function createSalesDelivery(operation) {
  role(operation);const input=normalizeDelivery(operation.input)
  const result=await transaction(async tx=>{
    const order=await lockOrder(tx,operation)
    // An advisory transaction lock also serializes reuse of the same key across orders.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.idempotencyKey}, 0))`
    const existing=await tx.salesDelivery.findUnique({where:{idempotencyKey:input.idempotencyKey}})
    if(existing){samePayload(existing,input,order.id);return replyOrder(tx,operation)}
    if(!['confirmed','partially_delivered'].includes(order.status)) throw createHttpError(409,'Phiếu không còn có thể giao hàng.')
    const lines=input.items.map(line=>{
      const item=order.items.find(item=>item.id===line.orderItemId)
      if(!item||line.quantity>item.quantity-item.deliveredQuantity) throw createHttpError(409,'Dòng giao không thuộc phiếu hoặc vượt lượng còn lại.')
      return {...line,batchId:item.batchId}
    })
    const batches=await lockBatches(tx,operation,order.items.map(item=>item.batchId))
    for(const line of lines){
      const batch=batches.get(line.batchId);saleable(batch)
      if(batch.reservedQuantity<line.quantity||batch.currentEstimatedQuantity<line.quantity) throw createHttpError(409,'Lượng giữ hàng không đủ.')
      const remaining=batch.currentEstimatedQuantity-line.quantity
      await tx.seedBatch.update({where:{id:batch.id},data:{currentEstimatedQuantity:{decrement:line.quantity},reservedQuantity:{decrement:line.quantity},...(remaining===0?{status:'sold'}:{})}})
      await tx.salesOrderItem.update({where:{id:line.orderItemId},data:{deliveredQuantity:{increment:line.quantity}}})
      if(remaining===0){
        const open=await tx.seedBatch.count({where:{tankId:batch.tankId,status:{in:['active','ready_for_sale']}}})
        if(!open) await tx.pondTank.update({where:{id:batch.tankId},data:{status:'cleaning'}})
      }
    }
    await tx.salesDelivery.create({data:{orderId:order.id,idempotencyKey:input.idempotencyKey,requestPayload:payload(input),notes:input.notes,createdBy:operation.actor.id,items:{create:input.items}}})
    await refreshStatus(tx,order)
    return replyOrder(tx,operation)
  })
  return result
}
export async function createSalesPayment(operation) {
  role(operation,true);const input=normalizePayment(operation.input)
  const result=await transaction(async tx=>{
    const order=await lockOrder(tx,operation)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.idempotencyKey}, 0))`
    const existing=await tx.salesPayment.findUnique({where:{idempotencyKey:input.idempotencyKey}})
    if(existing){samePayload(existing,input,order.id);return replyOrder(tx,operation)}
    if(!['confirmed','partially_delivered','delivered'].includes(order.status)) throw createHttpError(409,'Chỉ thu tiền phiếu đã duyệt và chưa hoàn tất.')
    const paid=order.payments.reduce((sum,payment)=>sum.plus(payment.amount),decimal(0))
    if(paid.plus(input.amount).gt(order.totalAmount)) throw createHttpError(409,'Số tiền thu vượt số tiền còn nợ.')
    await tx.salesPayment.create({data:{...input,orderId:order.id,requestPayload:payload(input),createdBy:operation.actor.id}})
    await refreshStatus(tx,order)
    return replyOrder(tx,operation)
  })
  return result
}
