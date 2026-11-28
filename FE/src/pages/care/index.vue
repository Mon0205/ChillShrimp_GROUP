<script setup>
import AppShell from '../../components/shell/index.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FeedingLogsPage from './components/FeedingLogs.vue'
import WaterChangeLogsPage from './components/WaterChanges.vue'
import WaterParameterLogsPage from './components/WaterParameters.vue'
import EnvironmentThresholdsPage from './components/WaterThresholds.vue'
import TreatmentLogsPage from './components/TreatmentLogs.vue'
import { loadFarmContext, selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { api } from '../../services/api.js'

const route = useRoute()
const router = useRouter()
const farmContext = useFarmContext()
const tankId = ref(typeof route.query.tankId === 'string' ? route.query.tankId : '')
const tanks = ref([])
const loadingTanks = ref(false)
const tankError = ref('')
let tankRequest = 0
const tabs = [
  { value: 'feeding', title: 'Cho ăn', icon: 'mdi-food-drumstick-outline', component: FeedingLogsPage },
  { value: 'water-changes', title: 'Thay nước', icon: 'mdi-water-sync', component: WaterChangeLogsPage },
  { value: 'water-parameters', title: 'Môi trường nước', icon: 'mdi-water-thermometer-outline', component: WaterParameterLogsPage },
  { value: 'thresholds', title: 'Ngưỡng môi trường', icon: 'mdi-chart-bell-curve-cumulative', component: EnvironmentThresholdsPage },
  { value: 'treatments', title: 'Thuốc/chế phẩm', icon: 'mdi-flask-outline', component: TreatmentLogsPage },
]
const activeTab = computed({
  get: () => tabs.some(tab => tab.value === route.query.tab) ? route.query.tab : 'feeding',
  set: tab => router.replace({ path: '/care-logs', query: { ...route.query, tab } }),
})
const activeComponent = computed(() => tabs.find(tab => tab.value === activeTab.value).component)
const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const role = computed(() => farmContext.farms.find(farm => farm.id === farmId.value)?.role)
const canView = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(role.value))

async function loadTanks() {
  const request = ++tankRequest
  tanks.value = []
  tankError.value = ''
  loadingTanks.value = true
  try {
    if (!farmId.value || !canView.value) return
    const result = await api(`/farms/${encodeURIComponent(farmId.value)}/ponds-tanks`)
    if (request === tankRequest) tanks.value = result.data
  } catch (error) {
    if (request === tankRequest) tankError.value = error.message
  } finally {
    if (request === tankRequest) loadingTanks.value = false
  }
}
watch(() => route.query.tankId, id => { tankId.value = typeof id === 'string' ? id : '' })
watch(farmId, (id, previousId) => {
  if (previousId) {
    tankId.value = ''
    router.replace({ query: { ...route.query, tankId: undefined } })
  }
  loadTanks()
})
watch(canView, loadTanks)
function selectTank(id) {
  tankId.value = id || ''
  router.replace({ query: { ...route.query, tankId: id || undefined } })
}
onMounted(async () => {
  try { await loadFarmContext(); await loadTanks() }
  catch (error) { tankError.value = error.message }
})
</script>

<template>
<AppShell>
    <section class="care-page">
      <header class="page-header">
        <div class="section-page-title"><div><span class="page-kicker">VẬN HÀNH</span><h1>Nhật kí chăm sóc</h1></div></div>
      </header>
      <v-alert v-if="tankError" type="error" variant="tonal" class="mb-4">{{ tankError }}</v-alert>
      <div v-if="canView" class="care-workspace">
        <v-tabs v-model="activeTab" color="primary" show-arrows class="care-tabs" aria-label="Loại nhật ký chăm sóc">
          <v-tab v-for="tab in tabs" :id="`care-tab-${tab.value}`" :key="tab.value" :value="tab.value" aria-controls="care-panel" rounded="0"><v-icon :icon="tab.icon" size="19" class="mr-2" />{{ tab.title }}</v-tab>
        </v-tabs>
        <div id="care-panel" class="care-content" role="tabpanel" :aria-labelledby="`care-tab-${activeTab}`">
          <component :is="activeComponent" :key="`${farmId}:${activeTab}`" v-bind="activeTab === 'thresholds' ? {} : { tankId: tankId || '' }">
            <template #filters><v-select :model-value="tankId || null" @update:model-value="selectTank" :items="tanks" item-title="name" item-value="id" aria-label="Ao/bể" placeholder="Ao/bể" clearable :loading="loadingTanks" :disabled="!canView" variant="outlined" density="compact" hide-details /></template>
          </component>
        </div>
      </div>
      <v-alert v-else-if="farmContext.ready" type="info" variant="tonal">{{ farmId ? 'Bạn không có quyền xem nhật ký chăm sóc của trang trại này.' : 'Chọn trang trại để xem nhật ký chăm sóc.' }}</v-alert>
    </section>
  </AppShell>
</template>

<style scoped>
.care-page { display: grid; gap: 22px; min-width: 0; }
h1 { margin: 0; font-size: 27px; letter-spacing: -.6px; }
.care-workspace { min-width: 0; }
.care-tabs { max-width: 100%; margin-bottom: 20px; border-bottom: 1px solid #dce7e8; }
.care-tabs :deep(.v-tab) { min-height: 48px; font-size: 13px; padding-inline: 18px; letter-spacing: 0; }
.care-tabs :deep(.v-tab--selected) { font-weight: 700; }
.care-tabs :deep(.v-tab__overlay) { opacity: 0; }
.care-content { min-width: 0; }
.care-content :deep(section) { min-width: 0; }
.care-content :deep(.list-actions) { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.care-content :deep(.care-list-card) { padding: 20px; border: 1px solid #dce7e8; border-radius: 12px; background: #fff; box-shadow: 0 3px 14px #173f3a04; }
.care-content :deep(.filter-row) { display: flex; flex-wrap: wrap; gap: 12px; padding-bottom: 18px; margin-bottom: 18px; border-bottom: 1px solid #edf2f3; }
.care-content :deep(.filter-row > .v-input) { flex: 0 1 220px; min-width: 0; max-width: 100%; }
.care-content :deep(.filter-row .date-range) { flex-basis: 300px; }
.care-content :deep(.table-wrap), .care-content :deep(.log-table-wrap) { min-width: 0; max-width: 100%; border-color: #e2ebed; }
.care-content :deep(.app-data-table th) { background: #f6fafb; color: #617d86; font-size: 11px; letter-spacing: .25px; }
.care-content :deep(.app-data-table td) { overflow-wrap: anywhere; font-size: 13px; }
@media (max-width: 760px) {
  h1 { font-size: 23px; }
  .care-page { gap: 18px; }
  .care-content :deep(.care-list-card) { padding: 16px; }
  .care-content :deep(.filter-row > .v-input) { flex: 1 1 100%; }
  .care-content :deep(.app-data-table), .care-content :deep(.app-data-table table) { width: 100%; min-width: 0; }
  .care-content :deep(.app-data-table thead) { display: none; }
  .care-content :deep(.app-data-table tbody) { display: block; }
  .care-content :deep(.app-data-table tbody tr) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; padding: 18px 14px; border-bottom: 1px solid #e2ebed; }
  .care-content :deep(.app-data-table tbody tr:last-child) { border-bottom: 0; }
  .care-content :deep(.app-data-table tbody td) { display: block; min-width: 0; max-width: 100%; height: auto; padding: 0; border: 0; white-space: normal; }
  .care-content :deep(.app-data-table tbody td:first-child) { grid-column: 1 / -1; }
  .care-content :deep(.app-data-table tbody td::before) { content: attr(data-label); display: block; margin-bottom: 5px; color: #617d86; font-size: 10px; font-weight: 600; }
  .care-content :deep(.cell-note) { max-width: 100%; white-space: normal; }
  .care-content :deep(.summary-item) { flex: 1 1 140px; min-width: 0; }
}
</style>
