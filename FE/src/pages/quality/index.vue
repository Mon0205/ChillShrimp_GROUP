<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/shell/index.vue'
import LoadingIndicator from '../../components/loading/index.vue'
import Pagination from '../../components/pagination/index.vue'
import DateRange from '../care/components/Date.vue'
import Inspection from '../seed-batches/components/Inspection.vue'
import { usePage } from '../seed-batches/composables/usePage.js'
import { api } from '../../services/api.js'
import { showToast } from '../../composables/toast.js'

const model = usePage()
const { farmId, canView, inspectionDialog, openInspectionUpload, selectedAiInspection, aiInspections, aiInspectionStatusNames, formatTimestamp, formatInspectionValue } = model
const batchId = ref(''), tankId = ref('')
const dates = ref({ from: '', to: '' })
const batches = ref([]), tanks = ref([]), rows = ref([])
const page = ref(1), pageSize = ref(10), total = ref(0), loading = ref(false)
const selectedBatch = computed(() => batches.value.find(batch => batch.id === batchId.value))
const batchOptions = computed(() => batches.value.filter(batch => !tankId.value || batch.tank?.id === tankId.value || batch.tankId === tankId.value))
let request = 0, optionsRequest = 0
const base = () => `/farms/${encodeURIComponent(farmId.value)}/seed-batches`
async function loadOptions() {
  const current = ++optionsRequest
  batches.value = []; tanks.value = []
  if (!farmId.value || !canView.value) return
  try {
    const tankResult = await api(`/farms/${encodeURIComponent(farmId.value)}/ponds-tanks`)
    const all = []
    let next = 1, count = 1
    do {
      const result = await api(`${base()}?page=${next}&limit=100`)
      if (current !== optionsRequest) return
      all.push(...result.data.items)
      count = result.data.pagination.pageCount || 1
      next++
    } while (next <= count)
    if (current === optionsRequest) { batches.value = all; tanks.value = tankResult.data }
  } catch (error) { if (current === optionsRequest) showToast(error.message, 'error') }
}
async function loadRows() {
  const current = ++request
  rows.value = []; total.value = 0
  if (!farmId.value || !canView.value) { loading.value = false; return }
  loading.value = true
  try {
    const query = new URLSearchParams({ page: String(page.value), limit: String(pageSize.value) })
    if (batchId.value) query.set('batchId', batchId.value)
    if (tankId.value) query.set('tankId', tankId.value)
    if (dates.value.from) query.set('from', new Date(`${dates.value.from}T00:00:00`).toISOString())
    if (dates.value.to) query.set('to', new Date(`${dates.value.to}T23:59:59.999`).toISOString())
    const result = await api(`${base()}/inspection-history?${query}`)
    if (current === request) { rows.value = result.data.items; total.value = result.data.pagination.total }
  } catch (error) { if (current === request) showToast(error.message, 'error') }
  finally { if (current === request) loading.value = false }
}
async function openRow(item) {
  await openInspectionUpload(item.batch)
  if (!aiInspections.value.some(inspection => inspection.id === item.id)) aiInspections.value.push(item)
  selectedAiInspection.value = item
}
function create() {
  if (selectedBatch.value) openInspectionUpload(selectedBatch.value)
}
watch([batchId, tankId, dates, pageSize], () => { if (page.value !== 1) page.value = 1; else loadRows() }, { deep: true })
watch(page, loadRows)
watch(tankId, () => { if (selectedBatch.value && !batchOptions.value.some(batch => batch.id === batchId.value)) batchId.value = '' })
watch([farmId, canView], () => { batchId.value = ''; tankId.value = ''; page.value = 1; loadOptions(); loadRows() })
watch(inspectionDialog, (open, previous) => { if (previous && !open) loadRows() })
onMounted(() => { loadOptions(); loadRows() })
</script>

<template>
  <AppShell>
    <header class="page-header"><div class="section-page-title"><v-avatar color="primary" variant="tonal" rounded="lg" size="44"><v-icon icon="mdi-clipboard-check-outline" size="25" /></v-avatar><h1>Kiểm tra AI</h1></div></header>
    <p v-if="!canView" class="empty-message">Bạn không có quyền xem kiểm tra AI của trại này.</p>
    <template v-else>
      <div class="page-actions list-actions">
        <v-tooltip :text="selectedBatch ? '' : 'Chọn lô giống để tải ảnh AI'" :disabled="!!selectedBatch">
          <template #activator="{ props }"><span v-bind="props"><v-btn color="primary" prepend-icon="mdi-plus" :disabled="!selectedBatch" @click="create">Tải ảnh AI</v-btn></span></template>
        </v-tooltip>
      </div>
      <v-card class="list-card" elevation="0">
        <div class="quality-filters">
          <v-select v-model="tankId" :items="tanks" item-title="name" item-value="id" label="Ao/bể" clearable density="compact" variant="outlined" hide-details />
          <v-select v-model="batchId" :items="batchOptions" item-title="batchCode" item-value="id" label="Lô giống" clearable density="compact" variant="outlined" hide-details />
          <DateRange v-model="dates" />
        </div>
        <LoadingIndicator v-if="loading" />
        <p v-else-if="!rows.length" class="empty-message">Chưa có ảnh kiểm tra AI trong phạm vi đã chọn.</p>
        <v-table v-else class="app-data-table" density="comfortable">
          <thead><tr><th>Lô giống</th><th>Ao/bể</th><th>Thời gian</th><th>Người kiểm tra</th><th>Ảnh</th><th>Số lượng phát hiện</th><th>Trạng thái</th></tr></thead>
          <tbody><tr v-for="item in rows" :key="item.id" class="quality-row" tabindex="0" @click="openRow(item)" @keydown.enter.self.prevent="openRow(item)" @keydown.space.self.prevent="openRow(item)">
            <td><strong>{{ item.batch.batchCode }}</strong></td><td>{{ item.batch.tank?.name || '—' }}</td><td>{{ formatTimestamp(item.inspectedAt || item.createdAt) }}</td><td>{{ item.creator?.displayName || '—' }}</td>
            
            <td><img class="inspection-thumb" :src="item.mediaUrl" alt="Ảnh mẫu kiểm tra AI" loading="lazy" /></td><td>{{ formatInspectionValue(item.detectedCount, 0) }}</td><td><v-chip size="small" variant="tonal">{{ aiInspectionStatusNames[item.status] || item.status }}</v-chip></td>
          </tr></tbody>
        </v-table>
        <Pagination v-model:page="page" v-model:page-size="pageSize" :total="total" :loading="loading" />
      </v-card>
    </template>
    <Inspection :model="model" />
  </AppShell>
</template>

<style scoped>
.quality-tabs { border-bottom:1px solid #dce6e2; margin-bottom:20px; }
.list-card { border:1px solid #dce6e2; background:#fff; }
.quality-filters { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:20px; }
.quality-filters > .v-input { flex:0 0 180px; max-width:100%; }
.quality-filters > .date-range { flex-basis:300px; }
.quality-row { cursor:pointer; }
.quality-row:focus-visible { outline:2px solid #078575; outline-offset:-2px; }
.inspection-thumb { display:block; width:64px; height:48px; object-fit:cover; border-radius:6px; }
.dialog-card { padding:24px; }
.dialog-actions { display:flex; justify-content:flex-end; gap:8px; }
@media(max-width:600px) { .quality-filters > .v-input { flex:1 1 160px; } .quality-filters > .date-range { flex-basis:100%; } }
</style>
