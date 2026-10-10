<script setup>
import Pagination from '../../../components/pagination/index.vue'
import DateRange from './Date.vue'
import LoadingIndicator from '../../../components/loading/index.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { selectFarm, useFarmContext } from '../../../composables/farm-context.js'
import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'

const props = defineProps({ tankId: { type: String, default: '' } })
const farmContext = useFarmContext()
const farms = ref([])
const tanks = ref([])
const logs = ref([])
const pagination = ref({ total: 0, pageCount: 1 })
const summary = ref({ averageWaterChangePercentage: null })
const loading = ref(true)
const listLoading = ref(false)
const saving = ref(false)
const error = ref('')
const dialog = ref(false)
const formRef = ref(null)
const page = ref(1)
const pageSize = ref(10)
const filters = ref({ tankId: props.tankId, from: '', to: '' })
const form = ref(emptyForm())

const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const role = computed(() => selectedFarm.value?.role || '')
const canRecord = computed(() => ['owner', 'area_manager', 'technician'].includes(role.value))
const pageCount = computed(() => Math.max(1, pagination.value.pageCount || 1))
const tankRule = (value) => Boolean(value) || 'Vui lòng chọn ao/bể.'
const percentageRule = (value) => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100 || 'Tỷ lệ phải từ 0 đến 100%.'
const dateRule = (value) => Boolean(value) && !Number.isNaN(new Date(value).getTime()) || 'Thời điểm thay nước không hợp lệ.'

function emptyForm() {
  return {
    tankId: '',
    waterChangePercentage: '',
    performedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    notes: '',
  }
}

function farmUrl(suffix = '') { return `/farms/${encodeURIComponent(farmId.value)}${suffix}` }
function formatNumber(value) { return Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) }
function formatDateTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

async function loadFarms() {
  farms.value = (await api('/farms')).data
  farmContext.farms = farms.value
  farmContext.ready = true
  if (!farms.value.some((farm) => farm.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
}

async function loadTanks() {
  tanks.value = []
  if (!farmId.value) return
  tanks.value = (await api(farmUrl('/ponds-tanks'))).data
}

function buildQuery() {
  const params = new URLSearchParams({ page: String(page.value), limit: String(pageSize.value) })
  if (filters.value.tankId) params.set('tankId', filters.value.tankId)
  if (filters.value.from) params.set('from', new Date(`${filters.value.from}T00:00:00`).toISOString())
  if (filters.value.to) params.set('to', new Date(`${filters.value.to}T23:59:59.999`).toISOString())
  return params.toString()
}

async function loadLogs() {
  if (!farmId.value) { logs.value = []; return }
  listLoading.value = true
  error.value = ''
  try {
    const result = await api(farmUrl(`/water-change-logs?${buildQuery()}`))
    logs.value = result.data.items
    pagination.value = result.data.pagination
    summary.value = result.data.summary
  } catch (err) {
    logs.value = []
    error.value = err.message
    showToast(err.message, 'error')
  } finally { listLoading.value = false }
}

async function loadPage() {
  loading.value = true
  error.value = ''
  try {
    await loadFarms()
    await Promise.all([loadTanks(), loadLogs()])
  } catch (err) {
    error.value = err.message
    showToast(err.message, 'error')
  } finally { loading.value = false }
}

function applyFilters() { page.value = 1; loadLogs() }
function openCreate() {
  form.value = { ...emptyForm(), tankId: filters.value.tankId || tanks.value[0]?.id || '' }
  dialog.value = true
}

async function saveLog() {
  const validation = await formRef.value?.validate()
  if (!validation?.valid) return showToast('Vui lòng kiểm tra các trường chưa hợp lệ.', 'error')
  if (form.value.notes.length > 4000) return showToast('Ghi chú tối đa 4.000 ký tự.', 'error')
  saving.value = true
  try {
    await api(farmUrl('/water-change-logs'), {
      method: 'POST',
      body: JSON.stringify({
        tankId: form.value.tankId,
        waterChangePercentage: Number(form.value.waterChangePercentage),
        performedAt: new Date(form.value.performedAt).toISOString(),
        notes: form.value.notes.trim() || null,
      }),
    })
    dialog.value = false
    showToast('Đã ghi nhật ký thay nước.', 'success')
    await loadLogs()
  } catch (err) { showToast(err.message, 'error') }
  finally { saving.value = false }
}

watch(farmId, async () => {
  page.value = 1
  filters.value.tankId = ''
  try { await Promise.all([loadTanks(), loadLogs()]) }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
})

watch(() => props.tankId, async (tankId) => {
  filters.value.tankId = tankId
  page.value = 1
  try { await loadLogs() }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
})
onMounted(loadPage)
watch(() => [filters.value.from, filters.value.to], applyFilters)
watch(page, loadLogs)
watch(pageSize, () => { if (page.value === 1) loadLogs(); else page.value = 1 })
</script>

<template>
<section class="water-change-page">
      <div class="page-actions list-actions"><v-btn color="primary" prepend-icon="mdi-plus" :disabled="!canRecord || !tanks.length" @click="openCreate">Ghi lần thay nước</v-btn></div>
      <v-card class="list-card care-list-card" elevation="0">

      <div class="filter-row">
        <slot name="filters" />
        <DateRange v-model="filters" />
      </div>

      <div v-if="summary.averageWaterChangePercentage !== null" class="summary-row">
        <span>Tỷ lệ thay nước trung bình theo kết quả lọc</span>
        <strong>{{ formatNumber(summary.averageWaterChangePercentage) }}%</strong>
      </div>


      <LoadingIndicator v-if="loading" />
      <div v-else-if="error" class="state-message error-state">{{ error }}</div>
      <div v-else-if="!farmId" class="state-message">Chọn trang trại để xem nhật ký.</div>
      <p v-else-if="!listLoading && !logs.length" class="empty-message">Chưa có nhật ký thay nước phù hợp.</p>
      <div v-else class="table-wrap">
        <v-table class="app-data-table log-table" density="comfortable">
          <thead><tr><th>Thời gian</th><th>Ao/bể</th><th>Tỷ lệ thay</th><th>Người ghi</th><th>Ghi chú</th></tr></thead>
          <tbody>
            <tr v-for="item in logs" :key="item.id">
              <td>{{ formatDateTime(item.performedAt) }}</td>
              <td><strong>{{ item.tank.name }}</strong><small>{{ item.tank.code }}</small></td>
              <td><strong>{{ formatNumber(item.waterChangePercentage) }}%</strong></td>
              <td>{{ item.performer.displayName || item.performer.email }}</td>
              <td class="note-cell">{{ item.notes || '—' }}</td>
            </tr>
          </tbody>
        </v-table>
        <Pagination v-model:page="page" v-model:page-size="pageSize" :total="pagination.total" :loading="listLoading" />
      </div>

      </v-card>

      <v-dialog v-model="dialog" max-width="560">
        <v-card class="form-card">
          <v-card-title>Ghi nhật ký thay nước</v-card-title>
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="saveLog">
              <v-select v-model="form.tankId" :items="tanks" item-title="name" item-value="id" label="Ao/bể *" :rules="[tankRule]">
                <template #item="{ props, item }"><v-list-item v-bind="props" :subtitle="item.raw.code" /></template>
              </v-select>
              <v-text-field v-model="form.waterChangePercentage" type="number" min="0" max="100" step="0.01" suffix="%" label="Tỷ lệ nước thay *" :rules="[percentageRule]" />
              <v-text-field v-model="form.performedAt" type="datetime-local" label="Thời điểm thực hiện *" :rules="[dateRule]" />
              <v-textarea v-model="form.notes" label="Ghi chú" rows="3" maxlength="4000" counter="4000" />
            </v-form>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="saving" @click="dialog = false">Hủy</v-btn><v-btn color="primary" :loading="saving" @click="saveLog">Lưu nhật ký</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    </section>
</template>

<style scoped>
.water-change-page { color:#173f3a; }
.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:24px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; }
h2 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { margin:8px 0 0; color:#71827e; font-size:13px; }
.filter-row { display:grid; grid-template-columns:minmax(150px,1fr) minmax(150px,1fr) auto; align-items:center; gap:12px; margin-bottom:16px; }
.summary-row { display:flex; align-items:center; gap:12px; margin-bottom:16px; padding:13px 16px; border:1px solid #d7e8e3; border-radius:8px; background:#fff; color:#71827e; font-size:12px; }
.summary-row strong { color:#173f3a; font-size:18px; }
.state-message { padding:34px 20px; border:1px solid #dbe9e5; border-radius:8px; color:#71827e; background:#fff; text-align:center; }
.error-state { color:#a33b3b; }
.table-wrap { overflow:hidden; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }
.log-table :deep(th) { color:#71827e; font-size:10px; font-weight:800; text-transform:uppercase; white-space:nowrap; }
.log-table :deep(td) { color:#34514c; font-size:12px; }
.log-table small { display:block; color:#83918e; font-size:10px; }
.note-cell { max-width:300px; }
.empty-row { height:100px; color:#83918e !important; text-align:center; }
.table-footer { display:flex; align-items:center; justify-content:space-between; min-height:52px; padding:0 14px; border-top:1px solid #e5eeeb; color:#71827e; font-size:11px; }
.pager { display:flex; align-items:center; gap:8px; }
.form-card { border-radius:8px !important; }
.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }
.form-card :deep(.v-card-text) { padding:12px 22px; }
@media(max-width:760px) { .page-heading { align-items:flex-start; flex-direction:column; }.filter-row { grid-template-columns:1fr 1fr; }.filter-row .v-btn { grid-column:1/-1; }.table-wrap { overflow-x:auto; } }
.empty-message { margin: 12px 0; color: #71827e; font-size: 13px; }

.water-change-page { color:#173f3a; }
.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:24px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; }
h2 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { margin:8px 0 0; color:#71827e; font-size:13px; }
.filter-row { display:grid; grid-template-columns:minmax(150px,1fr) minmax(150px,1fr) auto; align-items:center; gap:12px; margin-bottom:16px; }
.summary-row { display:flex; align-items:center; gap:12px; margin-bottom:16px; padding:13px 16px; border:1px solid #d7e8e3; border-radius:8px; background:#fff; color:#71827e; font-size:12px; }
.summary-row strong { color:#173f3a; font-size:18px; }
.state-message { padding:34px 20px; border:1px solid #dbe9e5; border-radius:8px; color:#71827e; background:#fff; text-align:center; }
.error-state { color:#a33b3b; }
.table-wrap { overflow:hidden; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }
.log-table :deep(th) { color:#71827e; font-size:10px; font-weight:800; text-transform:uppercase; white-space:nowrap; }
.log-table :deep(td) { color:#34514c; font-size:12px; }
.log-table small { display:block; color:#83918e; font-size:10px; }
.note-cell { max-width:300px; }
.empty-row { height:100px; color:#83918e !important; text-align:center; }
.table-footer { display:flex; align-items:center; justify-content:space-between; min-height:52px; padding:0 14px; border-top:1px solid #e5eeeb; color:#71827e; font-size:11px; }
.pager { display:flex; align-items:center; gap:8px; }
.form-card { border-radius:8px !important; }
.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }
.form-card :deep(.v-card-text) { padding:12px 22px; }
@media(max-width:760px) { .page-heading { align-items:flex-start; flex-direction:column; }.filter-row { grid-template-columns:1fr 1fr; }.filter-row .v-btn { grid-column:1/-1; }.table-wrap { overflow-x:auto; } }
.empty-message { margin: 12px 0; color: #71827e; font-size: 13px; }
</style>
