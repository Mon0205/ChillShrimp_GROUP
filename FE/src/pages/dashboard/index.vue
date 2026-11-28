<script setup>
import { formatTime } from '../../utils/datetime.js'
import AppShell from '../../components/shell/index.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAlertRealtime } from '../../composables/alert-realtime.js'
import { loadFarmContext, useFarmContext } from '../../composables/farm-context.js'
import { api } from '../../services/api.js'
import AlertsByArea from './components/AlertsByArea.vue'
import BusinessBlock from './components/BusinessBlock.vue'
import PendingOrdersTable from './components/PendingOrdersTable.vue'
import ShiftProgress from './components/ShiftProgress.vue'
import StatTile from './components/StatTile.vue'
import TankTodayTable from './components/TankTodayTable.vue'
import TaskCards from './components/TaskCards.vue'
import { amount, count, money } from './format.js'

// Role-based dashboard (spec: docs/superpowers/specs/2026-11-21-dashboard-design.md).
// Owner and farm manager share one frame: to-do cards, business block, production figures, then a main table.
// Area manager and technician get their own layouts (technician: "Việc hôm nay": progress, cards, own tanks). The backend
// decides which cards and figures a role receives. Warehouse staff are sent to Inventory by the router.
const MANAGEMENT_ROLES = ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER']
const DASHBOARD_ROLES = [...MANAGEMENT_ROLES, 'TECHNICIAN']
const roleNames = { OWNER: 'Chủ trại', FARM_MANAGER: 'Quản lý trại', AREA_MANAGER: 'Quản lý khu vực', TECHNICIAN: 'Kỹ thuật viên', WAREHOUSE_STAFF: 'Nhân viên kho' }

const router = useRouter()
const farmContext = useFarmContext()
const contextLoading = ref(true)
const contextError = ref('')
const summary = ref(null)
const summaryLoading = ref(false)
const summaryError = ref('')
const feeding = ref(null)
const feedingError = ref('')
let summaryController = null
let feedingController = null

const selectedFarm = computed(() => farmContext.farms.find((farm) => farm.id === farmContext.farmId))
const role = computed(() => selectedFarm.value?.role || '')
const hasDashboard = computed(() => DASHBOARD_ROLES.includes(role.value))
const isManagement = computed(() => MANAGEMENT_ROLES.includes(role.value))
const farmWide = computed(() => ['OWNER', 'FARM_MANAGER'].includes(role.value))
const scopeText = computed(() => {
  if (farmWide.value) return 'Toàn trại'
  if (role.value === 'WAREHOUSE_STAFF') return 'Kho của trại'
  return selectedFarm.value?.area?.name || 'Chưa được gán khu vực'
})
const technicianScope = computed(() => {
  const scope = stats.value.scope
  if (role.value !== 'TECHNICIAN' || !scope) return ''
  return scope.wholeArea ? 'Chưa phụ trách ao/bể nào, hiển thị toàn khu vực' : `Phụ trách ${scope.tanks} ao/bể, ${scope.batches} lô`
})
const infoLine = computed(() => [selectedFarm.value?.name, roleNames[role.value], scopeText.value, technicianScope.value].filter(Boolean).join(' · '))
// Names of the empty tanks of the area (as far as the rows shown), for the "ao/bể đang nuôi" tile.
const emptyTankNames = computed(() => (stats.value.tankRows || []).filter((row) => row.status !== 'active').map((row) => row.code))
const updatedAt = computed(() => (summary.value ? formatTime(summary.value.generatedAt) : ''))
const stats = computed(() => summary.value?.stats || {})

const feedingTotals = computed(() => {
  if (!feeding.value) return null
  return {
    units: feeding.value.amountsByUnit.map((item) => `${amount(item.actualAmount)} ${item.unit}`).join(' + ') || 'Chưa có',
    feedings: feeding.value.totalFeedings,
    tanks: new Set(feeding.value.byTank.map((row) => row.tankId)).size,
  }
})

// "Sản xuất" tiles of the owner and the farm manager. The last two differ: the owner sees the stock value,
// the farm manager sees how fast alerts get resolved.
const productionTiles = computed(() => {
  const production = stats.value.production
  if (!production) return []
  const idle = production.tanks.total - production.tanks.active
  const tiles = [
    { key: 'tanks', label: 'Ao/bể đang nuôi', value: count(production.tanks.active), suffix: `/ ${count(production.tanks.total)}`, sub: `${count(idle)} ao/bể trống` },
    { key: 'batches', label: 'Lô trong bể', value: `${count(production.batches.total)} lô`, sub: `${count(production.batches.active)} đang ương · ${count(production.batches.readyForSale)} sẵn sàng bán` },
    { key: 'fish', label: 'Số con trong bể', value: count(production.estimatedQuantity), sub: 'Ước tính, tự trừ khi giao hàng' },
    { key: 'sellable', label: 'Giống còn bán được', value: `${count(production.sellable.available)} con`, sub: `Đã giữ ${count(production.sellable.reserved)} con cho đơn`, accent: '#1d6fb8' },
  ]
  if (role.value === 'OWNER') tiles.push({ key: 'stock', label: 'Giá trị tồn kho', value: money(stats.value.inventoryValue), sub: 'Theo đơn giá nhập gần nhất', accent: '#1d6fb8' })
  if (role.value === 'FARM_MANAGER') {
    const resolution = stats.value.alertResolution
    tiles.push({ key: 'resolution', label: 'Xử lý cảnh báo trung bình', value: resolution?.count ? `${amount(resolution.averageHours)} giờ` : '—', sub: `${count(resolution?.count)} cảnh báo đã xong trong 30 ngày`, accent: '#7a5cc2' })
  }
  tiles.push({
    key: 'feeding',
    label: 'Thức ăn 30 ngày qua',
    value: feedingTotals.value ? feedingTotals.value.units : feedingError.value ? 'Không tải được' : 'Đang tải…',
    sub: feedingTotals.value ? `${count(feedingTotals.value.feedings)} lần · ${count(feedingTotals.value.tanks)} ao/bể · Xem báo cáo →` : '',
    accent: '#1d6fb8',
    to: '/feeding-report',
  })
  return tiles
})

async function loadSummary() {
  summaryController?.abort()
  summaryError.value = ''
  if (!farmContext.farmId || !hasDashboard.value) { summary.value = null; return }
  const controller = new AbortController()
  summaryController = controller
  summaryLoading.value = true
  try {
    const result = await api(`/farms/${encodeURIComponent(farmContext.farmId)}/dashboard/summary`, { signal: controller.signal })
    if (summaryController === controller) summary.value = result.data
  } catch (err) {
    if (summaryController === controller && err.name !== 'AbortError') summaryError.value = err.message
  } finally {
    if (summaryController === controller) summaryLoading.value = false
  }
}

// One-line feeding summary for the last 30 days; the full report is the "Báo cáo cho ăn" page.
async function loadFeeding() {
  feedingController?.abort()
  feeding.value = null
  feedingError.value = ''
  if (!farmContext.farmId || !isManagement.value) return
  const controller = new AbortController()
  feedingController = controller
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 29)
  from.setHours(0, 0, 0, 0)
  try {
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
    const result = await api(`/farms/${encodeURIComponent(farmContext.farmId)}/reports/feeding?${params}`, { signal: controller.signal })
    if (feedingController === controller) feeding.value = result.data
  } catch (err) {
    if (feedingController === controller && err.name !== 'AbortError') feedingError.value = err.message
  }
}

function refreshAll() {
  summary.value = null
  return Promise.all([loadSummary(), loadFeeding()])
}

// Alert cards follow realtime alert events, like the bell and the alerts page.
useAlertRealtime({ farmId: () => farmContext.farmId, enabled: hasDashboard, busy: summaryLoading, refresh: loadSummary })

watch([() => farmContext.farmId, role], () => {
  if (role.value === 'WAREHOUSE_STAFF') { router.replace('/inventory-supplies'); return }
  if (!contextLoading.value) refreshAll()
})

onMounted(async () => {
  try { await loadFarmContext(true) }
  catch (err) { contextError.value = err.message }
  finally { contextLoading.value = false }
  if (role.value === 'WAREHOUSE_STAFF') { router.replace('/inventory-supplies'); return }
  refreshAll()
})
onBeforeUnmount(() => { summaryController?.abort(); feedingController?.abort() })
</script>

<template>
<AppShell>
  <div class="dashboard">
    <section class="welcome">
      <div class="heading">
        <span class="page-kicker">{{ selectedFarm?.code || 'CHILLSHRIMP' }}</span>
        <h1>{{ role === 'TECHNICIAN' ? 'Việc hôm nay' : 'Dashboard' }}</h1>
        <p v-if="selectedFarm">{{ infoLine }}</p>
      </div>
      <div v-if="hasDashboard" class="refresh">
        <span v-if="updatedAt">Cập nhật lúc {{ updatedAt }}</span>
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-refresh" :loading="summaryLoading" @click="refreshAll">Làm mới</v-btn>
      </div>
    </section>

    <v-progress-linear v-if="contextLoading" indeterminate color="primary" rounded />
    <div v-else-if="contextError" class="notice error-notice" role="alert">Không tải được danh sách trại: {{ contextError }}</div>
    <v-card v-else-if="!farmContext.farms.length" class="empty-card" elevation="0">
      <h2>Chưa có trang trại</h2>
      <p>Tạo trang trại đầu tiên để bắt đầu quản lý dữ liệu vận hành.</p>
      <v-btn to="/farms" color="primary">Mở quản lý trang trại</v-btn>
    </v-card>

    <template v-else-if="hasDashboard">
      <div v-if="summaryError" class="notice error-notice" role="alert"><span>Không tải được Dashboard: {{ summaryError }}</span><v-btn size="small" variant="text" @click="loadSummary">Thử lại</v-btn></div>

      <ShiftProgress v-if="summary && role === 'TECHNICIAN' && stats.progress" :progress="stats.progress" />

      <TaskCards :title="role === 'TECHNICIAN' ? 'Việc cần làm' : 'Việc cần xử lý'" :cards="summary?.cards ?? null" />

      <!-- Owner and farm manager: business, production, then the main table -->
      <template v-if="summary && farmWide">
        <BusinessBlock v-if="stats.business" :key="farmContext.farmId" :business="stats.business" :farm-id="farmContext.farmId" />

        <section class="block" aria-labelledby="production-heading">
          <h2 id="production-heading">Sản xuất</h2>
          <div class="tile-grid">
            <StatTile v-for="tile in productionTiles" :key="tile.key" :label="tile.label" :value="tile.value" :suffix="tile.suffix" :sub="tile.sub" :accent="tile.accent" :to="tile.to" />
          </div>
        </section>

        <PendingOrdersTable v-if="role === 'OWNER'" :orders="stats.pendingOrders" />
        <AlertsByArea v-else :areas="stats.alertsByArea" />
      </template>

      <!-- Area manager: area figures and today's board of the area's tanks -->
      <template v-else-if="summary && role === 'AREA_MANAGER'">
        <section class="block" aria-labelledby="area-heading">
          <h2 id="area-heading">Tình hình khu</h2>
          <div class="tile-grid">
            <StatTile label="Ao/bể đang nuôi" :value="count(stats.production.tanks.active)" :suffix="`/ ${count(stats.production.tanks.total)}`" :sub="stats.production.tanks.total > stats.production.tanks.active ? `${count(stats.production.tanks.total - stats.production.tanks.active)} ao/bể trống${emptyTankNames.length ? ` (${emptyTankNames.slice(0, 3).join(', ')})` : ''}` : 'Không có ao/bể trống'" />
            <StatTile label="Lô đang ương" :value="`${count(stats.activeBatches.count)} lô`" :sub="`${count(stats.activeBatches.estimatedQuantity)} con (ước tính)`" />
            <StatTile label="Tiến độ hôm nay" :value="`${stats.progress.fed}/${stats.progress.tanks}`" suffix="ao đã cho ăn" :sub="`${stats.progress.waterChecked}/${stats.progress.tanks} ao đã đo nước trong 24 giờ`" accent="#1d6fb8" />
            <StatTile label="Thức ăn 30 ngày qua" :value="feedingTotals ? feedingTotals.units : feedingError ? 'Không tải được' : 'Đang tải…'" :sub="feedingTotals ? `${count(feedingTotals.feedings)} lần · ${count(feedingTotals.tanks)} ao/bể · Xem báo cáo →` : ''" accent="#1d6fb8" to="/feeding-report" />
          </div>
        </section>
        <TankTodayTable title="Ao/bể trong khu hôm nay" :rows="stats.tankRows" responsible />
      </template>

      <!-- Technician: "Việc hôm nay" - progress of the shift comes first, then the tanks the technician covers -->
      <TankTodayTable v-else-if="summary && role === 'TECHNICIAN'" :title="stats.scope?.wholeArea ? 'Ao/bể trong khu hôm nay' : 'Ao/bể của tôi hôm nay'" :rows="stats.tankRows" quick />
    </template>
  </div>
</AppShell>
</template>

<style scoped>
.dashboard { display: grid; gap: 18px; min-width: 0; color: #1f3a35; }
.welcome { display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; padding: 24px 28px; border: 1px solid #d8e8e2; border-radius: 16px; background: linear-gradient(110deg, #e7f4ee, #f5faf7); color: #175647; }
.heading { display: grid; gap: 6px; }
h1 { margin: 0; color: #134e4a; font-size: clamp(1.7rem, 3vw, 1.75rem); }
.heading p { margin: 0; color: #5f716d; font-size: 14px; }
.refresh { display: flex; align-items: center; gap: 12px; color: #5f716d; font-size: 12px; }
h2 { margin: 0; color: #134e4a; font-size: 15px; }
.block { display: grid; gap: 10px; }
.tile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.notice { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-radius: 12px; font-size: 13px; }
.error-notice { color: #9b3e3e; background: #fff0ef; }
.empty-card { display: grid; justify-items: center; gap: 10px; padding: 40px 24px; border: 1px solid #dce7e4 !important; border-radius: 14px !important; text-align: center; }
.empty-card h2 { font-size: 1.15rem; }
.empty-card p { margin: 0; color: #5f716d; font-size: 14px; }
</style>
