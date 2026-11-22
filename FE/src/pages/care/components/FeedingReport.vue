<script setup>
import DateRange from './DateRange.vue'
import LoadingIndicator from '../../../components/loading/index.vue'
import { onBeforeUnmount, ref, watch } from 'vue'
import { useFarmContext } from '../../../composables/farm-context.js'
import { api } from '../../../services/api.js'

// Full feeding report (moved here from the dashboard, which now shows a one-line summary).
// Same API and scope as before: whole farm, or the member's area below farm level.
const props = defineProps({ tankId: { type: String, default: '' } })
const farmContext = useFarmContext()
const report = ref(null)
const loading = ref(false)
const error = ref('')
const filters = ref(defaultRange())
let controller = null

function localDateString(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function defaultRange() {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 29)
  return { from: localDateString(from), to: localDateString(to) }
}

const formatAmount = (value, digits = 3) => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: digits })
const formatTime = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
const formatDay = (value) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`))
const checkNames = { consumed: 'Đã ăn hết', leftover: 'Còn thức ăn', not_checked: 'Chưa kiểm tra' }

async function loadReport() {
  controller?.abort()
  report.value = null
  error.value = ''
  if (!farmContext.farmId) return
  if (!filters.value.from || !filters.value.to) { error.value = 'Chọn khoảng ngày để xem báo cáo.'; return }
  const current = new AbortController()
  controller = current
  loading.value = true
  try {
    const params = new URLSearchParams({
      from: new Date(`${filters.value.from}T00:00:00`).toISOString(),
      to: new Date(`${filters.value.to}T23:59:59.999`).toISOString(),
    })
    if (props.tankId) params.set('tankId', props.tankId)
    const result = await api(`/farms/${encodeURIComponent(farmContext.farmId)}/reports/feeding?${params}`, { signal: current.signal })
    if (controller === current) report.value = result.data
  } catch (err) {
    if (controller === current && err.name !== 'AbortError') error.value = err.message
  } finally {
    if (controller === current) loading.value = false
  }
}

watch([() => farmContext.farmId, () => props.tankId, () => filters.value.from, () => filters.value.to], loadReport, { immediate: true })
onBeforeUnmount(() => controller?.abort())
</script>

<template>
<section class="feeding-report">
  <v-card class="list-card care-list-card" elevation="0">
    <div class="filter-row">
      <slot name="filters" />
      <DateRange v-model="filters" />
    </div>
    <p class="report-note">Chỉ tổng hợp nhật ký cho ăn đã lưu; không phải kế hoạch hay lượng xuất kho.</p>

    <LoadingIndicator v-if="loading" />
    <div v-else-if="error" class="notice error-notice" role="alert"><span>{{ error }}</span><v-btn v-if="filters.from" size="small" variant="text" @click="loadReport">Thử lại</v-btn></div>
    <template v-else-if="report">
      <p class="report-meta">{{ report.totalFeedings }} lần ghi nhận trong khoảng đã chọn</p>
      <div v-if="report.amountsByUnit.length" class="summary-row">
        <div v-for="item in report.amountsByUnit" :key="item.unit" class="summary-item">
          <span>Tổng lượng thực tế ({{ item.unit }})</span>
          <strong>{{ formatAmount(item.actualAmount) }} {{ item.unit }}</strong>
          <small>{{ item.feedingCount }} lần cho ăn</small>
        </div>
      </div>
      <p v-else class="report-empty">Chưa có nhật ký cho ăn trong khoảng thời gian này.</p>

      <div v-if="report.byTank.length" class="report-block">
        <h3>Theo ao/bể và đơn vị</h3>
        <div class="table-wrap"><v-table class="app-data-table" density="compact"><thead><tr><th>Ao/bể</th><th>Đơn vị</th><th>Thực tế</th><th>Số lần</th></tr></thead>
          <tbody><tr v-for="row in report.byTank" :key="`${row.tankId}-${row.unit}`"><td>{{ row.tankCode }} · {{ row.tankName }}</td><td>{{ row.unit }}</td><td>{{ formatAmount(row.actualAmount) }}</td><td>{{ row.feedingCount }}</td></tr></tbody>
        </v-table></div>
      </div>

      <div v-if="report.daily.length" class="report-block">
        <h3>Theo ngày</h3>
        <div class="table-wrap"><v-table class="app-data-table" density="compact"><thead><tr><th>Ngày</th><th>Đơn vị</th><th>Thực tế</th><th>Số lần</th></tr></thead>
          <tbody><tr v-for="row in report.daily" :key="`${row.date}-${row.unit}`"><td>{{ formatDay(row.date) }}</td><td>{{ row.unit }}</td><td>{{ formatAmount(row.actualAmount) }}</td><td>{{ row.feedingCount }}</td></tr></tbody>
        </v-table></div>
      </div>

      <div v-if="report.recent.length" class="report-block">
        <h3>Nhật ký gần đây</h3>
        <div class="table-wrap"><v-table class="app-data-table" density="compact"><thead><tr><th>Thời gian</th><th>Ao/bể</th><th>Thức ăn</th><th>Lượng ghi nhận</th><th>Sàng ăn</th></tr></thead>
          <tbody><tr v-for="row in report.recent" :key="row.id"><td>{{ formatTime(row.feedingTime) }}</td><td>{{ row.tankCode }} · {{ row.tankName }}</td><td>{{ row.feedName }}</td><td>{{ formatAmount(row.amount) }} {{ row.unit }}</td><td>{{ checkNames[row.feedCheckStatus] || '—' }}</td></tr></tbody>
        </v-table></div>
      </div>
    </template>
  </v-card>
</section>
</template>

<style scoped>
.feeding-report { color: #173f3a; }
.list-card { padding: 20px; border: 1px solid #dce7e4 !important; border-radius: 10px !important; display: grid; gap: 14px; }
.filter-row { display: grid; grid-template-columns: minmax(150px, 1fr) minmax(150px, 1fr); align-items: center; gap: 12px; }
.report-note, .report-meta, .report-empty { margin: 0; color: #5f716d; font-size: 12px; }
.summary-row { display: flex; flex-wrap: wrap; gap: 10px; }
.summary-item { min-width: 190px; padding: 13px 16px; border: 1px solid #d7e8e3; border-radius: 8px; background: #fff; }
.summary-item span, .summary-item small { display: block; color: #5f716d; font-size: 11px; }
.summary-item strong { display: block; margin: 3px 0; font-size: 19px; color: #087f6e; }
.report-block { border: 1px solid #e1eae7; border-radius: 8px; overflow: hidden; }
.report-block h3 { margin: 0; padding: 13px 15px; border-bottom: 1px solid #e5ecea; color: #315650; font-size: 13px; }
.table-wrap { overflow-x: auto; }
.report-block :deep(th) { color: #5f716d; font-size: 10px; font-weight: 800; text-transform: uppercase; white-space: nowrap; }
.report-block :deep(td) { color: #34514c; font-size: 12px; white-space: nowrap; }
.notice { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-radius: 10px; font-size: 13px; }
.error-notice { color: #9b3e3e; background: #fff0ef; }
@media (max-width: 760px) { .filter-row { grid-template-columns: 1fr; } }
</style>
