<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/shell/index.vue'
import LoadingIndicator from '../../components/loading/index.vue'
import Pagination from '../../components/pagination/index.vue'
import DateRange from '../care/components/Date.vue'
import Quality from '../seed-batches/components/Quality.vue'
import History from '../seed-batches/components/History.vue'
import Inspection from '../seed-batches/components/Inspection.vue'
import { usePage } from '../seed-batches/composables/usePage.js'
import { api } from '../../services/api.js'
import { showToast } from '../../composables/toast.js'

const model = usePage()
const { farmId, canView, isTechnician, qualityDialog, qualityHistoryDialog, inspectionDialog, reviewDialog, reviewForm, reviewSaving, saveReview, openQualityForm, openQualityHistory, openInspectionUpload, selectedAiInspection, aiInspections, qualityChecks, checkTypeOptions, resultNames, reviewNames, aiInspectionStatusNames, formatTimestamp, formatInspectionValue } = model
const tab = ref('checks'), batchId = ref(''), tankId = ref('')
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
    const result = await api(`${base()}/${tab.value === 'checks' ? 'quality-history' : 'inspection-history'}?${query}`)
    if (current === request) { rows.value = result.data.items; total.value = result.data.pagination.total }
  } catch (error) { if (current === request) showToast(error.message, 'error') }
  finally { if (current === request) loading.value = false }
}
async function openRow(item) {
  if (tab.value === 'checks') {
    await openQualityHistory(item.batch)
    if (qualityHistoryDialog.value) qualityChecks.value = [item]
  } else {
    await openInspectionUpload(item.batch)
    if (!aiInspections.value.some(inspection => inspection.id === item.id)) aiInspections.value.push(item)
    selectedAiInspection.value = item
  }
}
function create() {
  if (!selectedBatch.value) return
  if (tab.value === 'checks') openQualityForm(selectedBatch.value)
  else openInspectionUpload(selectedBatch.value)
}
watch([tab, batchId, tankId, dates, pageSize], () => { if (page.value !== 1) page.value = 1; else loadRows() }, { deep: true })
watch(page, loadRows)
watch(tankId, () => { if (selectedBatch.value && !batchOptions.value.some(batch => batch.id === batchId.value)) batchId.value = '' })
watch([farmId, canView], () => { batchId.value = ''; tankId.value = ''; page.value = 1; loadOptions(); loadRows() })
watch([qualityDialog, qualityHistoryDialog, inspectionDialog, reviewDialog], (values, previous) => { if (previous.some((open, index) => open && !values[index])) loadRows() })
onMounted(() => { loadOptions(); loadRows() })
</script>

<template>
  <AppShell>
    <header class="page-header"><div class="section-page-title"><v-avatar color="primary" variant="tonal" rounded="lg" size="44"><v-icon icon="mdi-clipboard-check-outline" size="25" /></v-avatar><h1>Kiểm tra chất lượng</h1></div></header>
    <p v-if="!canView" class="empty-message">Bạn không có quyền xem kiểm tra chất lượng của trại này.</p>
    <template v-else>
      <v-tabs v-model="tab" color="primary" class="quality-tabs"><v-tab value="checks">Lịch sử kiểm tra</v-tab><v-tab value="ai">Kiểm tra AI</v-tab></v-tabs>
      <div class="page-actions list-actions">
        <v-tooltip :text="selectedBatch ? '' : 'Chọn lô giống để ghi kiểm tra hoặc tải ảnh'" :disabled="!!selectedBatch">
          <template #activator="{ props }"><span v-bind="props"><v-btn v-if="tab === 'ai' || isTechnician" color="primary" prepend-icon="mdi-plus" :disabled="!selectedBatch" @click="create">{{ tab === 'checks' ? 'Ghi kiểm tra' : 'Tải ảnh AI' }}</v-btn></span></template>
        </v-tooltip>
      </div>
      <v-card class="list-card" elevation="0">
        <div class="quality-filters">
          <v-select v-model="tankId" :items="tanks" item-title="name" item-value="id" label="Ao/bể" clearable density="compact" variant="outlined" hide-details />
          <v-select v-model="batchId" :items="batchOptions" item-title="batchCode" item-value="id" label="Lô giống" clearable density="compact" variant="outlined" hide-details />
          <DateRange v-model="dates" />
        </div>
        <LoadingIndicator v-if="loading" />
        <p v-else-if="!rows.length" class="empty-message">{{ tab === 'checks' ? 'Chưa có lần kiểm tra trong phạm vi đã chọn.' : 'Chưa có ảnh kiểm tra AI trong phạm vi đã chọn.' }}</p>
        <v-table v-else class="app-data-table" density="comfortable">
          <thead><tr><th>Lô giống</th><th>Ao/bể</th><th>Thời gian</th><th>Người kiểm tra</th><template v-if="tab === 'checks'"><th>Loại kiểm tra</th><th>Kết quả</th><th>Xử lý</th></template><template v-else><th>Ảnh</th><th>Số lượng phát hiện</th><th>Trạng thái</th></template></tr></thead>
          <tbody><tr v-for="item in rows" :key="item.id" class="quality-row" tabindex="0" @click="openRow(item)" @keydown.enter.self.prevent="openRow(item)" @keydown.space.self.prevent="openRow(item)">
            <td><strong>{{ item.batch.batchCode }}</strong></td><td>{{ item.batch.tank?.name || '—' }}</td><td>{{ formatTimestamp(tab === 'checks' ? item.checkedAt : item.inspectedAt || item.createdAt) }}</td><td>{{ (item.checker || item.creator)?.displayName || item.checker?.email || '—' }}</td>
            <template v-if="tab === 'checks'"><td>{{ checkTypeOptions.find(option => option.value === item.checkType)?.title || item.checkType }}</td><td><v-chip size="small" variant="tonal" :color="item.result === 'pass' ? 'success' : item.result === 'fail' ? 'error' : 'warning'">{{ resultNames[item.result] || item.result }}</v-chip></td><td>{{ reviewNames[item.reviewStatus] || item.reviewStatus }}</td></template>
            <template v-else><td><img class="inspection-thumb" :src="item.mediaUrl" alt="Ảnh mẫu kiểm tra AI" loading="lazy" /></td><td>{{ formatInspectionValue(item.detectedCount, 0) }}</td><td><v-chip size="small" variant="tonal">{{ aiInspectionStatusNames[item.status] || item.status }}</v-chip></td></template>
          </tr></tbody>
        </v-table>
        <Pagination v-model:page="page" v-model:page-size="pageSize" :total="total" :loading="loading" />
      </v-card>
    </template>
    <Quality :model="model" /><History :model="model" /><Inspection :model="model" />
    <v-dialog v-model="reviewDialog" max-width="540"><v-card class="dialog-card"><h2>{{ reviewForm.reviewStatus === 'confirmed' ? 'Xác nhận kết quả' : reviewForm.reviewStatus === 'action_required' ? 'Yêu cầu xử lý' : 'Xác nhận đã xử lý' }}</h2><v-textarea v-model="reviewForm.reviewNotes" label="Ghi chú xử lý" maxlength="4000" rows="3" auto-grow hide-details="auto" /><div class="dialog-actions"><v-btn variant="text" @click="reviewDialog = false">Hủy</v-btn><v-btn color="primary" :loading="reviewSaving" @click="saveReview">Lưu quyết định</v-btn></div></v-card></v-dialog>
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
