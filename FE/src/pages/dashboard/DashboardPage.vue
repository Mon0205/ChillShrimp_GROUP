<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { loadFarmContext, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const loading = ref(true)
const error = ref('')
const reportLoading = ref(false)
const reportError = ref('')
const feedingReport = ref(null)
const reportTanks = ref([])
const reportFilters = ref(defaultReportFilters())
const roleNames = { owner: 'Chủ trại', area_manager: 'Quản lý khu vực', technician: 'Nhân viên kỹ thuật', warehouse_staff: 'Nhân viên kho' }
const farms = computed(() => farmContext.farms)
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmContext.farmId))
const canViewFeedingReport = computed(() => ['owner', 'area_manager', 'technician'].includes(selectedFarm.value?.role))
const selectedRole = computed(() => roleNames[selectedFarm.value?.role] || 'Chưa xác định')
const selectedScope = computed(() => selectedFarm.value?.area?.name || 'Toàn trại')

function localDateString(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function defaultReportFilters() {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 29)
  return { from: localDateString(from), to: localDateString(to), tankId: '' }
}

function reportDate(value, endOfDay = false) {
  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`).toISOString()
}

function formatReportAmount(value, digits = 3) {
  return Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: digits })
}

function formatReportTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function formatReportDay(value) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`))
}

async function loadFeedingTanks() {
  reportTanks.value = []
  if (!farmContext.farmId || !canViewFeedingReport.value) return
  try {
    const response = await api(`/farms/${encodeURIComponent(farmContext.farmId)}/ponds-tanks`)
    reportTanks.value = response.data
  } catch (err) {
    reportError.value = err.message
  }
}

async function loadFeedingReport() {
  if (!farmContext.farmId || !canViewFeedingReport.value) { feedingReport.value = null; return }
  if (!reportFilters.value.from || !reportFilters.value.to || reportFilters.value.from > reportFilters.value.to) {
    reportError.value = 'Chọn khoảng ngày hợp lệ.'
    return
  }
  reportLoading.value = true
  reportError.value = ''
  try {
    const params = new URLSearchParams({ from: reportDate(reportFilters.value.from), to: reportDate(reportFilters.value.to, true) })
    if (reportFilters.value.tankId) params.set('tankId', reportFilters.value.tankId)
    feedingReport.value = (await api(`/farms/${encodeURIComponent(farmContext.farmId)}/reports/feeding?${params}`)).data
  } catch (err) {
    feedingReport.value = null
    reportError.value = err.message
    showToast(err.message, 'error')
  } finally { reportLoading.value = false }
}

async function loadDashboard() {
  try {
    await loadFarmContext(true)
    await Promise.all([loadFeedingTanks(), loadFeedingReport()])
  }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
  finally { loading.value = false }
}

watch(() => farmContext.farmId, async () => {
  reportFilters.value.tankId = ''
  try { await Promise.all([loadFeedingTanks(), loadFeedingReport()]) }
  catch (err) { reportError.value = err.message }
})

onMounted(loadDashboard)
</script>

<template>
  <AppShell>
    <header class="page-header">
      <div>
        <span class="eyebrow">TỔNG QUAN VẬN HÀNH</span>
        <h1>Dashboard</h1>
        <p>Tổng quan về các trang trại và phạm vi làm việc của bạn.</p>
      </div>
      <div class="page-actions">
        <v-btn to="/farms" color="primary" variant="outlined">Quản lý trang trại</v-btn>
        <v-btn to="/users" color="primary">Quản lý người dùng</v-btn>
      </div>
    </header>

    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />
    <div v-else-if="error" class="notice error-notice">Không thể tải thông tin tổng quan.</div>
    <template v-else-if="farms.length">
      <section class="metrics-grid">
        <v-card class="metric-card" elevation="0"><span>Trang trại tham gia</span><strong>{{ farms.length }}</strong><small>Membership đang hoạt động</small></v-card>
        <v-card class="metric-card" elevation="0"><span>Farm đang chọn</span><strong>{{ selectedFarm?.code || '—' }}</strong><small>{{ selectedFarm?.name || 'Chưa chọn trang trại' }}</small></v-card>
        <v-card class="metric-card" elevation="0"><span>Vai trò hiện tại</span><strong class="metric-role">{{ selectedRole }}</strong><small>Phạm vi: {{ selectedScope }}</small></v-card>
      </section>

      <v-card class="overview-card" elevation="0">
        <div class="overview-heading"><div><span class="eyebrow">FARM ĐANG LÀM VIỆC</span><h2>{{ selectedFarm?.name || 'Chưa chọn trang trại' }}</h2></div><span class="farm-code">{{ selectedFarm?.code || '—' }}</span></div>
        <div class="overview-grid">
          <div><span class="detail-label">Địa chỉ</span><strong>{{ selectedFarm?.address || 'Chưa cập nhật' }}</strong></div>
          <div><span class="detail-label">Phạm vi</span><strong>{{ selectedScope }}</strong></div>
          <div><span class="detail-label">Quyền truy cập</span><strong>{{ selectedRole }}</strong></div>
        </div>
        <div class="overview-actions"><v-btn to="/farms" color="primary" variant="text">Xem thông tin farm</v-btn><v-btn to="/users" color="primary" variant="text">Xem thành viên</v-btn></div>
      </v-card>
      <v-card v-if="canViewFeedingReport" class="overview-card feeding-report" elevation="0">
        <div class="report-heading">
          <div><span class="eyebrow">UC09.1 · BÁO CÁO VẬN HÀNH</span><h2>Thức ăn đã ghi nhận</h2><p>Số liệu chỉ tổng hợp nhật ký cho ăn đã lưu; không đại diện cho kế hoạch hoặc lượng xuất kho.</p></div>
          <v-btn to="/feeding-logs" color="primary" variant="outlined">Mở nhật ký</v-btn>
        </div>
        <div class="report-filters">
          <v-text-field v-model="reportFilters.from" type="date" label="Từ ngày" density="compact" hide-details />
          <v-text-field v-model="reportFilters.to" type="date" label="Đến ngày" density="compact" hide-details />
          <v-select v-model="reportFilters.tankId" :items="reportTanks" item-title="name" item-value="id" label="Ao/bể" clearable density="compact" hide-details />
          <v-btn color="primary" :loading="reportLoading" @click="loadFeedingReport">Cập nhật</v-btn>
        </div>
        <v-progress-linear v-if="reportLoading" indeterminate color="primary" />
        <div v-else-if="reportError" class="notice error-notice">{{ reportError }}</div>
        <template v-else-if="feedingReport">
          <div class="report-meta">{{ feedingReport.totalFeedings }} lần ghi nhận trong khoảng đã chọn</div>
          <div v-if="feedingReport.amountsByUnit.length" class="report-summary">
            <article v-for="item in feedingReport.amountsByUnit" :key="item.unit" class="report-stat">
              <span>Tổng lượng thực tế · {{ item.unit }}</span><strong>{{ formatReportAmount(item.actualAmount) }} {{ item.unit }}</strong>
              <small v-if="item.recommendedAmount !== null">Khuyến nghị: {{ formatReportAmount(item.recommendedAmount) }} {{ item.unit }} · Chênh lệch: {{ Number(item.variance) > 0 ? '+' : '' }}{{ formatReportAmount(item.variance) }} {{ item.unit }}</small>
              <small v-else>Chưa đủ dữ liệu khuyến nghị để so sánh.</small>
              <small>{{ item.comparableCount }}/{{ item.feedingCount }} bản ghi có khuyến nghị</small>
            </article>
          </div>
          <div v-else class="report-empty">Chưa có nhật ký cho ăn trong khoảng thời gian này.</div>

          <div v-if="feedingReport.byTank.length" class="report-block">
            <h3>Theo ao/bể và đơn vị</h3>
            <v-table density="compact"><thead><tr><th>Ao/bể</th><th>Đơn vị</th><th>Thực tế</th><th>Khuyến nghị</th><th>Chênh lệch</th><th>Số lần</th></tr></thead>
              <tbody><tr v-for="row in feedingReport.byTank" :key="`${row.tankId}-${row.unit}`"><td>{{ row.tankCode }} · {{ row.tankName }}</td><td>{{ row.unit }}</td><td>{{ formatReportAmount(row.actualAmount) }}</td><td>{{ row.recommendedAmount === null ? 'Chưa có' : formatReportAmount(row.recommendedAmount) }}</td><td>{{ row.variance === null ? '—' : `${Number(row.variance) > 0 ? '+' : ''}${formatReportAmount(row.variance)}` }}</td><td>{{ row.feedingCount }}</td></tr></tbody>
            </v-table>
          </div>

          <div v-if="feedingReport.daily.length" class="report-block">
            <h3>Theo ngày</h3>
            <v-table density="compact"><thead><tr><th>Ngày</th><th>Đơn vị</th><th>Thực tế</th><th>Khuyến nghị</th><th>Chênh lệch</th><th>Số lần</th></tr></thead>
              <tbody><tr v-for="row in feedingReport.daily" :key="`${row.date}-${row.unit}`"><td>{{ formatReportDay(row.date) }}</td><td>{{ row.unit }}</td><td>{{ formatReportAmount(row.actualAmount) }}</td><td>{{ row.recommendedAmount === null ? 'Chưa có' : formatReportAmount(row.recommendedAmount) }}</td><td>{{ row.variance === null ? '—' : `${Number(row.variance) > 0 ? '+' : ''}${formatReportAmount(row.variance)}` }}</td><td>{{ row.feedingCount }}</td></tr></tbody>
            </v-table>
          </div>

          <div v-if="feedingReport.recent.length" class="report-block">
            <h3>Nhật ký gần đây</h3>
            <v-table density="compact"><thead><tr><th>Thời gian</th><th>Ao/bể</th><th>Thức ăn</th><th>Lượng ghi nhận</th><th>Sàng ăn</th></tr></thead>
              <tbody><tr v-for="row in feedingReport.recent" :key="row.id"><td>{{ formatReportTime(row.feedingTime) }}</td><td>{{ row.tankCode }} · {{ row.tankName }}</td><td>{{ row.feedName }}</td><td>{{ formatReportAmount(row.amount) }} {{ row.unit }}</td><td>{{ ({ consumed: 'Đã ăn hết', leftover: 'Còn thức ăn', not_checked: 'Chưa kiểm tra' })[row.feedCheckStatus] || '—' }}</td></tr></tbody>
            </v-table>
          </div>
        </template>
      </v-card>
    </template>
    <v-card v-else class="empty-card" elevation="0">
      <div class="empty-icon">+</div><h2>Chưa có trang trại</h2><p>Tạo trang trại đầu tiên để bắt đầu quản lý dữ liệu vận hành.</p><v-btn to="/farms" color="primary">Mở quản lý trang trại</v-btn>
    </v-card>
  </AppShell>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:26px}.page-header p{margin:0;color:#70817e;font-size:13px}.page-actions{display:flex;gap:10px}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.13em}h1{margin:0 0 9px;color:#134e4a;font-size:clamp(1.85rem,3vw,2.55rem)}h2{margin:0;color:#134e4a;font-size:1.25rem}.notice{padding:16px;border-radius:12px;font-size:13px}.error-notice{color:#9b3e3e;background:#fff0ef}.metrics-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.metric-card,.overview-card,.empty-card{border:1px solid #dce7e4!important;border-radius:18px!important;background:white!important}.metric-card{display:grid;gap:8px;padding:22px}.metric-card span,.detail-label{color:#82908d;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.metric-card strong{color:#087f6e;font-size:28px}.metric-card small{color:#74837f;font-size:11px}.metric-role{font-size:18px!important}.overview-card{margin-top:20px;padding:26px}.overview-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding-bottom:20px;border-bottom:1px solid #e5ecea}.farm-code{padding:6px 10px;border-radius:8px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.overview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;padding:22px 0}.overview-grid div{display:grid;gap:7px}.overview-grid strong{color:#365751;font-size:13px}.overview-actions{display:flex;justify-content:flex-end;gap:4px}.empty-card{padding:46px;text-align:center}.empty-icon{width:48px;height:48px;display:grid;place-items:center;margin:0 auto 14px;border-radius:14px;color:#087f6e;background:#e7f4f1;font-size:25px}.empty-card p{margin:8px 0 20px;color:#70817e;font-size:13px}@media(max-width:760px){.page-header{align-items:stretch;flex-direction:column}.page-actions .v-btn{flex:1}.metrics-grid,.overview-grid{grid-template-columns:1fr}.overview-actions{justify-content:stretch;flex-direction:column}.empty-card{padding:34px 22px}}
.feeding-report{display:grid;gap:18px}.report-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.report-heading p{margin:7px 0 0;color:#71827e;font-size:12px}.report-filters{display:grid;grid-template-columns:1fr 1fr 1.2fr auto;align-items:center;gap:12px;padding-bottom:16px;border-bottom:1px solid #e5ecea}.report-meta{color:#71827e;font-size:11px}.report-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.report-stat{display:grid;gap:5px;padding:15px;border:1px solid #dce7e4;border-radius:9px;background:#fff}.report-stat span,.report-stat small{color:#71827e;font-size:10px}.report-stat strong{color:#087f6e;font-size:20px}.report-block{overflow:hidden;border:1px solid #e1eae7;border-radius:8px}.report-block h3{margin:0;padding:13px 15px;border-bottom:1px solid #e5ecea;color:#315650;font-size:13px}.report-block :deep(th){color:#71827e;font-size:10px;font-weight:800;text-transform:uppercase;white-space:nowrap}.report-block :deep(td){color:#34514c;font-size:11px;white-space:nowrap}.report-empty{padding:22px;border-radius:8px;background:#f5faf8;color:#71827e;text-align:center;font-size:12px}@media(max-width:760px){.report-heading{align-items:stretch;flex-direction:column}.report-filters{grid-template-columns:1fr 1fr}.report-filters .v-btn{grid-column:1/-1}.report-block{overflow-x:auto}}
</style>
