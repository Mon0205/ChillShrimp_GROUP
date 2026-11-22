<script setup>
import { count, dayMonth, daysFromToday, money } from '../format.js'

// The open orders that matter most, promised delivery soonest first. A late order is marked in red.
defineProps({ orders: { type: Array, default: () => [] } })

function status(order) {
  const days = daysFromToday(order.expectedDeliveryDate)
  if (days === null) return { text: 'Chưa hẹn ngày', tone: 'none' }
  if (days < 0) return { text: `Trễ ${-days} ngày`, tone: 'late' }
  if (days === 0) return { text: 'Giao hôm nay', tone: 'soon' }
  return { text: `Còn ${days} ngày`, tone: 'ok' }
}
</script>

<template>
  <section class="panel" aria-labelledby="pending-orders-heading">
    <div class="head">
      <h2 id="pending-orders-heading">Đơn bán chờ giao</h2>
      <router-link to="/sales-orders?status=confirmed,partially_delivered" class="link">Mở tab Chờ giao →</router-link>
    </div>
    <p v-if="!orders.length" class="empty">Không có đơn nào đang chờ giao.</p>
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th scope="col" class="text">Mã đơn</th><th scope="col" class="text">Khách hàng</th><th scope="col" class="text">Hẹn giao</th><th scope="col">Đã giao / đặt</th><th scope="col">Còn phải thu</th><th scope="col" class="text">Tiến độ</th></tr></thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td class="text strong">{{ order.orderCode }}</td>
            <td class="text">{{ order.customerName }}</td>
            <td class="text">{{ dayMonth(order.expectedDeliveryDate) }}</td>
            <td>{{ count(order.deliveredQuantity) }} / {{ count(order.quantity) }}</td>
            <td>{{ money(order.outstandingAmount) }}</td>
            <td class="text"><span class="tag" :class="status(order).tone">{{ status(order).text }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 10px; box-sizing: border-box; min-width: 0; padding: 18px 20px; border: 1px solid #dce7e4; border-radius: 12px; background: #fff; }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
h2 { margin: 0; color: #134e4a; font-size: 15px; }
.link { color: #087f6e; font-size: 13px; font-weight: 500; text-decoration: none; }
.link:hover { text-decoration: underline; }
.link:focus-visible { outline: 2px solid #087f6e; outline-offset: 2px; }
.empty { margin: 0; color: #5f716d; font-size: 13px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
th, td { padding: 9px 8px; text-align: right; border-bottom: 1px solid #edf2f0; }
tbody tr:last-child td { border-bottom: 0; }
th { color: #5f716d; font-size: 12px; font-weight: 700; border-bottom-color: #dce7e4; }
.text { text-align: left; }
.strong { color: #134e4a; font-weight: 700; }
.tag { padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; background: #edf2f0; color: #4f6662; }
.tag.late { background: #fdecea; color: #b3261e; }
.tag.soon { background: #fff2d4; color: #7a5000; }
.tag.ok { background: #e0f3ed; color: #076656; }
</style>
