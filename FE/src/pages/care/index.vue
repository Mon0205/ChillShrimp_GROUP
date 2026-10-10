<script setup>
import AppShell from '../../components/shell/index.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FeedingLogsPage from './components/Feed.vue'
import WaterChangeLogsPage from './components/Water.vue'
import WaterParameterLogsPage from './components/Params.vue'
import EnvironmentThresholdsPage from './components/Limits.vue'
import TreatmentLogsPage from './components/Treatment.vue'
import { loadFarmContext, selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { api } from '../../services/api.js'

const route = useRoute()
const router = useRouter()
const farmContext = useFarmContext()
const tankId = ref('')
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
const canView = computed(() => ['owner', 'area_manager', 'technician'].includes(role.value))

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
watch([farmId, canView], () => { tankId.value = ''; loadTanks() })
onMounted(async () => {
  try { await loadFarmContext(); await loadTanks() }
  catch (error) { tankError.value = error.message }
})
</script>

<template>
<AppShell>
    <section class="care-page">
      <header>
        <h1>Nhật ký chăm sóc</h1>
        <p>Theo dõi cho ăn, thay nước, môi trường và sử dụng thuốc/chế phẩm.</p>
      </header>
      <div class="care-filters">
        <v-select v-model="farmId" :items="farmContext.farms" item-title="name" item-value="id" label="Trang trại" variant="outlined" density="comfortable" hide-details />
        <v-select v-if="activeTab !== 'thresholds'" v-model="tankId" :items="tanks" item-title="name" item-value="id" label="Ao/bể" clearable :loading="loadingTanks" :disabled="!canView" variant="outlined" density="comfortable" hide-details />
      </div>
      <v-alert v-if="tankError" type="error" variant="tonal" class="mb-4">{{ tankError }}</v-alert>
      <template v-if="canView">
        <v-tabs v-model="activeTab" color="primary" show-arrows class="care-tabs" aria-label="Loại nhật ký chăm sóc">
          <v-tab v-for="tab in tabs" :key="tab.value" :value="tab.value" rounded="0">{{ tab.title }}</v-tab>
        </v-tabs>
        <div class="care-content" role="tabpanel" :aria-label="tabs.find(tab => tab.value === activeTab).title">
          <component :is="activeComponent" :key="`${farmId}:${activeTab}`" v-bind="activeTab === 'thresholds' ? {} : { tankId: tankId || '' }" />
        </div>
      </template>
      <v-alert v-else-if="farmContext.ready" type="info" variant="tonal">{{ farmId ? 'Bạn không có quyền xem nhật ký chăm sóc của trang trại này.' : 'Chọn trang trại để xem nhật ký chăm sóc.' }}</v-alert>
    </section>
  </AppShell>
</template>

<style scoped>
.care-page { display: grid; gap: 24px; }
h1 { font-size: 28px; margin: 0 0 8px; }
header p { color: #64748b; margin: 0; }
.care-filters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; max-width: 860px; }
.care-tabs { border-bottom: 1px solid #dce6e2; }
.care-tabs :deep(.v-tab) { font-size: 14px; padding-inline: 20px; }
.care-tabs :deep(.v-tab--selected) { font-weight: 700; }
.care-tabs :deep(.v-tab__overlay) { opacity: 0; }
.care-content :deep(.page-heading) { margin-bottom: 20px; }
.care-content :deep(.page-heading h2) { font-size: 20px; }
.care-content :deep(.page-heading .subtitle) { max-width: 700px; }
.care-content :deep(.filter-row) { max-width: 860px; }
.care-content { min-width: 0; }
@media (max-width: 600px) { .care-filters { grid-template-columns: 1fr; } h1 { font-size: 24px; } }
</style>
