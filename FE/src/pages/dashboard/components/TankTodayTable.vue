<script setup>
import { count } from '../format.js'

// One row per tank for today's care. Work still to do is in red; empty tanks need no care.
// "responsible" shows who looks after each tank (area manager); "quick" shows links to the care logs (technician).
defineProps({
  title: { type: String, required: true },
  rows: { type: Array, default: () => [] },
  responsible: { type: Boolean, default: false },
  quick: { type: Boolean, default: false },
  now: { type: Number, default: () => Date.now() },
})

const WATER_HOURS = 24
const feedChecks = {
  consumed: { text: 'Ăn hết', tone: 'ok' },
  leftover: { text: 'Còn dư', tone: 'left' },
  not_checked: { text: 'Chưa kiểm tra', tone: 'none' },
}

const waterAgeHours = (row, now) => (row.lastWaterAt ? Math.floor((now - new Date(row.lastWaterAt).getTime()) / 3600000) : null)
const waterLate = (row, now) => row.status === 'active' && (waterAgeHours(row, now) === null || waterAgeHours(row, now) >= WATER_HOURS)
const feedLate = (row) => row.status === 'active' && row.feedingsToday === 0
function waterText(row, now) {
  const hours = waterAgeHours(row, now)
  if (hours === null) return 'Chưa có'
  return hours < 1 ? 'Vừa xong' : `${count(hours)} giờ trước`
}
const careLink = (tab, row) => `/care-logs?tab=${tab}&tankId=${encodeURIComponent(row.id)}`
</script>

<template>
  <section class="panel" aria-labelledby="tank-today-heading">
    <div class="head">
      <h2 id="tank-today-heading">{{ title }}</h2>
      <router-link to="/care-logs?tab=feeding" class="link">Mở Nhật ký chăm sóc →</router-link>
    </div>
    <p v-if="!rows.length" class="empty">Chưa có ao/bể nào trong phạm vi của bạn.</p>
    <template v-else>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Ao/bể · Lô</th>
              <th v-if="responsible" scope="col">Phụ trách</th>
              <th scope="col">Cho ăn hôm nay</th>
              <th scope="col">Đo nước gần nhất</th>
              <th scope="col">Thức ăn lần gần nhất</th>
              <th v-if="quick" scope="col">Ghi nhanh</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" :class="{ empty: row.status !== 'active' }">
              <td><strong>{{ row.code }}</strong> · {{ row.batchCode || (row.status === 'active' ? 'chưa có lô' : 'trống') }}</td>
              <td v-if="responsible"><span v-if="!row.responsible && row.status === 'active'" class="warn">Chưa phân công</span><template v-else>{{ row.responsible || '—' }}</template></td>
              <template v-if="row.status === 'active'">
                <td><span v-if="feedLate(row)" class="late">Chưa cho ăn</span><template v-else>{{ count(row.feedingsToday) }} lần</template></td>
                <td><span :class="{ late: waterLate(row, now) }">{{ waterText(row, now) }}</span></td>
                <td><span v-if="row.lastFeedCheck" class="tag" :class="(feedChecks[row.lastFeedCheck] || feedChecks.not_checked).tone">{{ (feedChecks[row.lastFeedCheck] || feedChecks.not_checked).text }}</span><template v-else>—</template></td>
                <td v-if="quick">
                  <template v-if="feedLate(row) || waterLate(row, now)">
                    <router-link v-if="feedLate(row)" :to="careLink('feeding', row)" class="link">Cho ăn</router-link><template v-if="feedLate(row) && waterLate(row, now)"> · </template><router-link v-if="waterLate(row, now)" :to="careLink('water-parameters', row)" class="link">Đo nước</router-link>
                  </template>
                  <span v-else class="done">Đã xong</span>
                </td>
              </template>
              <template v-else>
                <td>—</td><td>—</td><td>—</td><td v-if="quick">—</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="note">Chữ đỏ là việc chưa làm hoặc đã quá 24 giờ. Ao trống không cần chăm sóc.<template v-if="quick"> Bấm "Cho ăn", "Đo nước" để mở nhật ký của đúng ao đó.</template></p>
    </template>
  </section>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 10px; box-sizing: border-box; min-width: 0; padding: 18px 20px; border: 1px solid #d8e6e3; border-radius: 16px; background: #fff; }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
h2 { margin: 0; color: #134e4a; font-size: 15px; }
.link { color: #087f6e; font-size: 13px; font-weight: 500; text-decoration: none; }
.link:hover { text-decoration: underline; }
.link:focus-visible { outline: 2px solid #087f6e; outline-offset: 2px; }
.empty, .note { margin: 0; color: #5f716d; font-size: 12px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 13px; }
th, td { padding: 9px 8px; text-align: left; border-bottom: 1px solid #edf2f0; }
tbody tr:last-child td { border-bottom: 0; }
th { color: #5f716d; font-size: 12px; font-weight: 700; border-bottom-color: #dce7e4; }
tr.empty td { color: #5f716d; }
.late { color: #b3261e; font-weight: 700; }
.warn { color: #9a4a00; font-weight: 500; }
.done { color: #5f716d; }
.tag { padding: 2px 8px; border-radius: 6px; font-size: 12px; background: #edf2f0; color: #4f6662; white-space: nowrap; }
.tag.ok { background: #e0f3ed; color: #076656; }
.tag.left { background: #fff3e0; color: #9a4a00; font-weight: 700; }
</style>
