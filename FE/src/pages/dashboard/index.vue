<script setup>
import AppShell from '../../components/shell/index.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { loadFarmContext, useFarmContext } from '../../composables/farm-context.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const loading = ref(true)
const error = ref('')
const reportLoading = ref(false)
const reportError = ref('')
const report = ref(null)
const operations = ref({ tanks: null, active: null, ready: null })
const operationErrors = ref({})
const activeTanks = computed(() => operations.value.tanks?.filter(tank => tank.status === 'active').length)
const selectedFarm = computed(() => farmContext.farms.find(farm => farm.id === farmContext.farmId))
const roles = { OWNER: 'Chủ trại', FARM_MANAGER: 'Quản lý trại', AREA_MANAGER: 'Quản lý khu vực', TECHNICIAN: 'Nhân viên kỹ thuật', WAREHOUSE_STAFF: 'Nhân viên kho' }
const canViewReport = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(selectedFarm.value?.role))
const scope = computed(() => ['OWNER', 'FARM_MANAGER'].includes(selectedFarm.value?.role) ? 'Toàn trại' : selectedFarm.value?.area?.name || 'Khu vực được gán')
const dateLabel = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date())
const amount = value => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })
let generation = 0
let disposed = false
onUnmounted(() => { disposed = true; generation++ })

const unitCharts = computed(() => (report.value?.amountsByUnit || []).map(unit => {
  const rows = report.value.daily.filter(row => row.unit === unit.unit)
  const maximum = Math.max(...rows.map(row => Number(row.actualAmount)), 1)
  return { ...unit, rows: rows.map(row => ({ ...row, width: Math.max(0, Number(row.actualAmount) / maximum * 100) })) }
}))

async function loadSummary() {
  const request = ++generation
  const farmId = farmContext.farmId
  report.value = null
  operations.value = { tanks: null, active: null, ready: null }
  operationErrors.value = {}
  reportError.value = ''
  reportLoading.value = false
  if (!farmId || !canViewReport.value) return
  reportLoading.value = true
  const current = () => !disposed && request === generation && farmId === farmContext.farmId
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date(to)
  from.setDate(from.getDate() - 6)
  from.setHours(0, 0, 0, 0)
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
  const base = `/farms/${encodeURIComponent(farmId)}`
  const results = await Promise.allSettled([
    api(`${base}/reports/feeding?${params}`),
    api(`${base}/ponds-tanks`),
    api(`${base}/seed-batches?page=1&limit=1&status=active`),
    api(`${base}/seed-batches?page=1&limit=1&status=ready_for_sale`),
  ])
  if (!current()) return
  const keys = ['report', 'tanks', 'active', 'ready']
  results.forEach((result, index) => {
    const key = keys[index]
    if (result.status === 'rejected') {
      if (key === 'report') reportError.value = result.reason.message
      else operationErrors.value[key] = result.reason.message
      return
    }
    if (key === 'report') report.value = result.value.data
    else operations.value[key] = key === 'tanks' ? result.value.data : result.value.data.pagination.total
  })
  reportLoading.value = false
}

watch(() => [farmContext.farmId, selectedFarm.value?.role, selectedFarm.value?.area?.id], () => {
  report.value = null
  operations.value = { tanks: null, active: null, ready: null }
  operationErrors.value = {}
  reportError.value = ''
  generation++
  if (!loading.value) loadSummary()
}, { flush: 'sync' })
onMounted(async () => {
  try { await loadFarmContext(); if (disposed) return; loading.value = false; await loadSummary() }
  catch (err) { error.value = err.message }
  finally { loading.value = false }
})
</script>

<template>
  <AppShell>
    <section class="welcome">
      <div><span class="eyebrow">{{ selectedFarm?.code || 'CHILLSHRIMP' }}</span><h1>Dashboard</h1><p>{{ selectedFarm?.name || 'Tổng quan trang trại' }}</p><small>{{ dateLabel }}</small></div>
      <div class="welcome-mark"><v-icon icon="mdi-fish" size="54" /></div>
    </section>
    <v-progress-linear v-if="loading" color="primary" indeterminate />
    <div v-else-if="error" class="notice" role="status">{{ error }}</div>
    <template v-else-if="selectedFarm">
      <section v-if="canViewReport" class="metrics-grid" aria-label="Số liệu vận hành">
        <v-card class="metric" elevation="0"><span>Bể đang ương</span><strong>{{ operations.tanks === null ? '—' : `${activeTanks} / ${operations.tanks.length}` }}</strong><small>{{ reportLoading ? 'Đang tải…' : operationErrors.tanks || 'Trong danh sách bể được phép xem' }}</small></v-card>
        <v-card class="metric" elevation="0"><span>Lô đang ương</span><strong>{{ operations.active ?? '—' }}</strong><small>{{ reportLoading ? 'Đang tải…' : operationErrors.active || 'Tổng lô có trạng thái đang ương' }}</small></v-card>
        <v-card class="metric" elevation="0"><span>Lô sẵn sàng bán</span><strong>{{ operations.ready ?? '—' }}</strong><small>{{ reportLoading ? 'Đang tải…' : operationErrors.ready || 'Tổng lô có trạng thái sẵn sàng bán' }}</small></v-card>
        <v-card class="metric" elevation="0"><span>Lần cho ăn · 7 ngày</span><strong>{{ report?.totalFeedings ?? '—' }}</strong><small>{{ reportLoading ? 'Đang tải…' : reportError || 'Nhật ký đã lưu trong 7 ngày gần nhất' }}</small></v-card>
      </section>
      <p v-if="canViewReport" class="scope-note">Phạm vi: {{ scope }}.</p>
      <div class="dashboard-grid">
        <v-card v-if="canViewReport" class="panel" elevation="0">
          <div class="panel-heading"><div><span class="eyebrow">7 NGÀY GẦN NHẤT</span><h2>Thức ăn đã ghi nhận</h2></div><v-btn to="/feeding-report" variant="text" color="primary" append-icon="mdi-arrow-right">Mở báo cáo</v-btn></div>
          <p class="scope-note">Nhật ký 7 ngày gần nhất · {{ scope }}</p>
          <v-progress-linear v-if="reportLoading" indeterminate color="primary" />
          <p v-else-if="reportError" class="notice" role="status">{{ reportError }}</p>
          <template v-else-if="report">
            <p class="record-count">{{ report.totalFeedings }} lần ghi nhận</p>
            <div v-for="unit in unitCharts" :key="unit.unit" class="unit-chart">
              <div class="unit-heading"><strong>{{ amount(unit.actualAmount) }} <small>{{ unit.unit }}</small></strong><span>{{ unit.feedingCount }} lần cho ăn</span></div>
              <div class="bars" :aria-label="`Lượng thức ăn đã ghi nhận theo ngày (${unit.unit})`">
                <div v-for="row in unit.rows" :key="row.date" class="bar-row"><time :datetime="row.date">{{ row.date.slice(8) }}/{{ row.date.slice(5, 7) }}</time><div class="bar-track"><div class="bar-fill" :style="{ width: `${row.width}%` }" /></div><span>{{ amount(row.actualAmount) }} {{ unit.unit }}</span></div>
              </div>
            </div>
            <p v-if="!report.amountsByUnit.length" class="empty-message">Chưa có nhật ký cho ăn trong 7 ngày gần nhất.</p>
          </template>
        </v-card>
        <v-card class="panel farm-panel" elevation="0"><div class="panel-heading"><h2>Thông tin trang trại</h2><v-icon icon="mdi-map-marker-outline" color="primary" /></div><dl><dt>Vai trò hiện tại</dt><dd>{{ roles[selectedFarm.role] || selectedFarm.role }}</dd><dt>Trang trại tham gia</dt><dd>{{ farmContext.farms.length }}</dd><dt>Tên trang trại</dt><dd>{{ selectedFarm.name }}</dd><dt>Mã trang trại</dt><dd>{{ selectedFarm.code || 'Chưa cập nhật' }}</dd><dt>Địa chỉ</dt><dd>{{ selectedFarm.address || 'Chưa cập nhật' }}</dd></dl><v-btn to="/farms" variant="outlined" color="primary" block>Xem trang trại</v-btn><v-btn v-if="canViewReport" to="/feeding-logs" variant="tonal" color="primary" block class="mt-3">Mở nhật ký chăm sóc</v-btn></v-card>
      </div>
    </template>
    <v-card v-else class="panel empty-state" elevation="0"><v-icon icon="mdi-home-group" size="42" color="primary" /><h2>Chưa có trang trại</h2><p>Tạo hoặc tham gia trang trại để bắt đầu quản lý vận hành.</p><v-btn to="/farms" color="primary">Quản lý trang trại</v-btn></v-card>
  </AppShell>
</template>

<style scoped>
.welcome{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:27px 30px;margin-bottom:22px;border:1px solid #d8e8e2;border-radius:16px;background:linear-gradient(110deg,#e7f4ee,#f5faf7);color:#175647}.eyebrow{display:block;color:#25785f;letter-spacing:.1em;font-size:10px;font-weight:800;margin-bottom:8px}h1{font-size:29px;line-height:1.2;margin:0 0 8px}h2{font-size:17px;color:#244f45;margin:0}.welcome p{margin:0 0 8px;font-size:14px}.welcome small{color:#57746a}.welcome-mark{display:grid;place-items:center;color:#207d63;background:#d9eee2;border-radius:50%;width:92px;height:92px;flex-shrink:0}.metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-bottom:22px}.metric,.panel{border:1px solid #dfe9e3!important;border-radius:14px!important;background:#fff!important}.metric{display:grid;gap:10px;padding:22px}.metric>span,.metric small{color:#6a7d74;font-size:12px}.metric strong{font-size:29px;color:#16745a}.metric .text-value{font-size:19px;overflow-wrap:anywhere}.dashboard-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:22px;align-items:start}.panel{padding:23px;min-width:0}.panel-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.scope-note,.record-count,.empty-message{font-size:12px;line-height:1.7;color:#657b70;margin:14px 0}.unit-chart{margin-top:20px}.unit-heading{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.unit-heading strong{color:#19775b;font-size:25px}.unit-heading small{font-size:14px}.unit-heading>span{font-size:11px;color:#71857a}.bars{display:grid;gap:12px;margin-top:18px}.bar-row{display:grid;grid-template-columns:42px minmax(0,1fr) minmax(66px,auto);align-items:center;gap:12px;font-size:11px;color:#496b5b}.bar-row>span{text-align:right;overflow-wrap:anywhere}.bar-track{height:10px;background:#edf5f0;border-radius:5px;overflow:hidden}.bar-fill{height:100%;background:#269979;border-radius:5px}.farm-panel dl{margin:24px 0}.farm-panel dt{font-size:11px;color:#718379;margin-top:18px}.farm-panel dd{font-size:13px;color:#345d4d;margin:5px 0;overflow-wrap:anywhere}.notice{padding:14px;border-radius:10px;background:#fff3ed;color:#8b4838;font-size:13px}.empty-state{text-align:center;padding:40px 20px}.empty-state h2{margin-top:12px}.empty-state p{font-size:13px;color:#657b70;margin:12px 0 22px}@media(max-width:1100px){.metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:900px){.dashboard-grid{grid-template-columns:1fr}}@media(max-width:600px){.welcome{padding:22px}.welcome-mark{width:58px;height:58px}.welcome-mark .v-icon{font-size:35px!important}.metrics-grid{grid-template-columns:1fr;gap:12px}.metric{padding:18px}.panel{padding:18px}.bar-row{gap:8px}.panel-heading .v-btn{padding-inline:6px}}
</style>
