<script setup>
import Pagination from '../../../components/pagination/index.vue'
import DateRange from './Date.vue'
import LoadingIndicator from '../../../components/loading/index.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { selectFarm, useFarmContext } from '../../../composables/farm-context.js'
import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'

const props = defineProps({ tankId: { type: String, default: '' } })
const measurements = [
  { key: 'temperature', title: 'Nhiệt độ', unit: '°C' },
  { key: 'ph', title: 'pH', unit: '' },
  { key: 'salinity', title: 'Độ mặn', unit: 'ppt' },
  { key: 'dissolvedOxygen', title: 'DO', unit: 'mg/L' },
  { key: 'nh3', title: 'NH₃', unit: 'mg/L' },
  { key: 'tan', title: 'TAN', unit: 'mg/L' },
  { key: 'no2', title: 'NO₂', unit: 'mg/L' },
  { key: 'nitrate', title: 'NO₃', unit: 'mg/L' },
  { key: 'alkalinity', title: 'Độ kiềm', unit: 'mg/L CaCO₃' },
  { key: 'h2s', title: 'H₂S', unit: 'ppm' },
  { key: 'turbidity', title: 'Độ đục', unit: '' },
  { key: 'waterLevelM', title: 'Mực nước', unit: 'm' },
]
const methods = [
  { title: 'Đo thủ công', value: 'manual' },
  { title: 'Cảm biến IoT', value: 'iot' },
  { title: 'Phòng thí nghiệm', value: 'lab' },
]
const methodNames = Object.fromEntries(methods.map(({ title, value }) => [value, title]))

const farmContext = useFarmContext()
const farms = ref([])
const tanks = ref([])
const logs = ref([])
const pagination = ref({ total: 0, pageCount: 1 })
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
const dateRule = (value) => Boolean(value) && !Number.isNaN(new Date(value).getTime()) || 'Thời điểm đo không hợp lệ.'
const methodRule = (value) => methods.some((method) => method.value === value) || 'Phương pháp đo không hợp lệ.'
function measurementRules(metric) {
  return [(value) => {
    if (value === '' || value === null) return true
    const number = Number(value)
    if (!Number.isFinite(number) || (metric.key !== 'temperature' && number < 0) || number < -999_999_999.999 || number > 999_999_999.999) {
      return `${metric.title} không nằm trong miền giá trị hợp lệ.`
    }
    if (metric.key === 'ph' && number > 14) return 'pH phải nằm trong khoảng 0 đến 14.'
    if (Math.abs(number * 1000 - Math.round(number * 1000)) > 1e-7) return `${metric.title} tối đa 3 chữ số thập phân.`
    return true
  }]
}

function emptyForm() {
  return {
    tankId: '',
    ...Object.fromEntries(measurements.map(({ key }) => [key, ''])),
    measurementMethod: 'manual',
    measurementDevice: '',
    recordedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    notes: '',
  }
}

function farmUrl(suffix = '') { return `/farms/${encodeURIComponent(farmId.value)}${suffix}` }
function formatDateTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
function formatValue(value) { return value === null || value === undefined ? null : Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 3 }) }
function measuredValues(log) {
  return measurements.filter(({ key }) => log[key] !== null).map((metric) => `${metric.title}: ${formatValue(log[metric.key])}${metric.unit ? ` ${metric.unit}` : ''}`)
}

async function loadFarms() {
  farms.value = (await api('/farms')).data
  farmContext.farms = farms.value
  farmContext.ready = true
  if (!farms.value.some((farm) => farm.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
}

async function loadTanks() {
  tanks.value = []
  if (farmId.value) tanks.value = (await api(farmUrl('/ponds-tanks'))).data
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
    const result = await api(farmUrl(`/water-parameter-logs?${buildQuery()}`))
    logs.value = result.data.items
    pagination.value = result.data.pagination
  } catch (err) {
    logs.value = []
    error.value = err.message
    showToast(err.message, 'error')
  } finally { listLoading.value = false }
}

async function loadPage() {
  loading.value = true
  error.value = ''
  try { await loadFarms(); await Promise.all([loadTanks(), loadLogs()]) }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
  finally { loading.value = false }
}

function applyFilters() { page.value = 1; loadLogs() }
function openCreate() {
  form.value = { ...emptyForm(), tankId: filters.value.tankId || tanks.value[0]?.id || '' }
  dialog.value = true
}

async function saveLog() {
  const validation = await formRef.value?.validate()
  if (!validation?.valid) return showToast('Vui lòng kiểm tra các trường chưa hợp lệ.', 'error')
  if (!measurements.some(({ key }) => form.value[key] !== '' && form.value[key] !== null)) {
    return showToast('Nhập ít nhất một thông số đã đo.', 'error')
  }
  if (form.value.measurementDevice.length > 100) return showToast('Tên thiết bị đo tối đa 100 ký tự.', 'error')
  if (form.value.notes.length > 4000) return showToast('Ghi chú tối đa 4.000 ký tự.', 'error')

  saving.value = true
  try {
    const payload = {
      tankId: form.value.tankId,
      ...Object.fromEntries(measurements.map(({ key }) => [key, form.value[key] === '' ? null : Number(form.value[key])])),
      measurementMethod: form.value.measurementMethod,
      measurementDevice: form.value.measurementDevice.trim() || null,
      recordedAt: new Date(form.value.recordedAt).toISOString(),
      notes: form.value.notes.trim() || null,
    }
    await api(farmUrl('/water-parameter-logs'), { method: 'POST', body: JSON.stringify(payload) })
    dialog.value = false
    showToast('Đã ghi thông số môi trường.', 'success')
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
<section class="environment-page">
      <div class="page-actions list-actions"><v-btn color="primary" prepend-icon="mdi-plus" :disabled="!canRecord || !tanks.length" @click="openCreate">Ghi kết quả đo</v-btn></div>
      <v-card class="list-card care-list-card" elevation="0">

      <div class="filter-row">
        <slot name="filters" />
        <DateRange v-model="filters" />
      </div>


      <LoadingIndicator v-if="loading" />
      <div v-else-if="error" class="state-message error-state">{{ error }}</div>
      <div v-else-if="!farmId" class="state-message">Chọn trang trại để xem thông số.</div>
      <p v-else-if="!listLoading && !logs.length" class="empty-message">Chưa có kết quả đo phù hợp.</p>
      <div v-else class="table-wrap">
        <v-table class="app-data-table log-table" density="comfortable">
          <thead><tr><th>Thời gian đo</th><th>Ao/bể</th><th>Các chỉ số đã ghi</th><th>Phương pháp / thiết bị</th><th>Người ghi</th><th>Ghi chú</th></tr></thead>
          <tbody>
            <tr v-for="item in logs" :key="item.id">
              <td>{{ formatDateTime(item.recordedAt) }}</td>
              <td><strong>{{ item.tank.name }}</strong><small>{{ item.tank.code }}</small></td>
              <td><div class="measurement-list"><span v-for="entry in measuredValues(item)" :key="entry">{{ entry }}</span></div></td>
              <td>{{ methodNames[item.measurementMethod] }}<small v-if="item.measurementDevice">{{ item.measurementDevice }}</small></td>
              <td>{{ item.recorder.displayName || item.recorder.email }}</td>
              <td class="note-cell">{{ item.notes || '—' }}</td>
            </tr>
          </tbody>
        </v-table>
        <Pagination v-model:page="page" v-model:page-size="pageSize" :total="pagination.total" :loading="listLoading" />
      </div>

      </v-card>

      <v-dialog v-model="dialog" max-width="850">
        <v-card class="form-card">
          <v-card-title>Ghi thông số môi trường</v-card-title>
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="saveLog">
              <div class="form-grid">
                <v-select v-model="form.tankId" :items="tanks" item-title="name" item-value="id" label="Ao/bể *" :rules="[tankRule]" />
                <v-text-field v-model="form.recordedAt" type="datetime-local" label="Thời điểm đo *" :rules="[dateRule]" />
                <v-select v-model="form.measurementMethod" :items="methods" label="Phương pháp đo *" :rules="[methodRule]" />
                <v-text-field v-model="form.measurementDevice" label="Thiết bị đo" maxlength="100" />
                <v-text-field v-for="metric in measurements" :key="metric.key" v-model="form[metric.key]" type="number" :min="metric.key === 'temperature' ? undefined : 0" :max="metric.key === 'ph' ? 14 : 999999999.999" step="0.001" :rules="measurementRules(metric)" :label="`${metric.title}${metric.unit ? ` (${metric.unit})` : ''}`" />
                <p class="form-hint">Để trống thông số chưa đo; cần nhập ít nhất một kết quả. Hệ thống sẽ đối chiếu ngưỡng đã được phê duyệt và tạo cảnh báo nếu vượt giới hạn.</p>
                <v-textarea v-model="form.notes" label="Ghi chú" rows="2" maxlength="4000" counter="4000" class="full-width" />
              </div>
            </v-form>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="saving" @click="dialog = false">Hủy</v-btn><v-btn color="primary" :loading="saving" @click="saveLog">Lưu kết quả</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    </section>
</template>

<style scoped>
.environment-page { color:#173f3a; }
.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:24px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; }
h2 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { margin:8px 0 0; color:#71827e; font-size:13px; }
.filter-row { display:grid; grid-template-columns:minmax(150px,1fr) minmax(150px,1fr) auto; align-items:center; gap:12px; margin-bottom:16px; }
.state-message { padding:34px 20px; border:1px solid #dbe9e5; border-radius:8px; color:#71827e; background:#fff; text-align:center; }
.error-state { color:#a33b3b; }
.table-wrap { overflow:hidden; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }
.log-table :deep(th) { color:#71827e; font-size:10px; font-weight:800; text-transform:uppercase; white-space:nowrap; }
.log-table :deep(td) { color:#34514c; font-size:12px; vertical-align:top; }
.log-table small { display:block; color:#83918e; font-size:10px; }
.measurement-list { display:grid; grid-template-columns:repeat(2,minmax(120px,1fr)); gap:3px 12px; min-width:290px; }
.measurement-list span { color:#34514c; white-space:nowrap; }
.note-cell { max-width:220px; }
.empty-row { height:100px; color:#83918e !important; text-align:center; }
.table-footer { display:flex; align-items:center; justify-content:space-between; min-height:52px; padding:0 14px; border-top:1px solid #e5eeeb; color:#71827e; font-size:11px; }
.pager { display:flex; align-items:center; gap:8px; }
.form-card { border-radius:8px !important; }
.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }
.form-card :deep(.v-card-text) { padding:12px 22px; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 14px; }
.form-hint { grid-column:1/-1; margin:0; color:#71827e; font-size:11px; }
.full-width { grid-column:1/-1; }
@media(max-width:760px) { .page-heading { align-items:flex-start; flex-direction:column; }.filter-row { grid-template-columns:1fr 1fr; }.filter-row .v-btn { grid-column:1/-1; }.form-grid { grid-template-columns:1fr; }.form-hint,.full-width { grid-column:auto; }.table-wrap { overflow-x:auto; } }
.empty-message { margin: 12px 0; color: #71827e; font-size: 13px; }

.environment-page { color:#173f3a; }
.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:24px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; }
h2 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { margin:8px 0 0; color:#71827e; font-size:13px; }
.filter-row { display:grid; grid-template-columns:minmax(150px,1fr) minmax(150px,1fr) auto; align-items:center; gap:12px; margin-bottom:16px; }
.state-message { padding:34px 20px; border:1px solid #dbe9e5; border-radius:8px; color:#71827e; background:#fff; text-align:center; }
.error-state { color:#a33b3b; }
.table-wrap { overflow:hidden; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }
.log-table :deep(th) { color:#71827e; font-size:10px; font-weight:800; text-transform:uppercase; white-space:nowrap; }
.log-table :deep(td) { color:#34514c; font-size:12px; vertical-align:top; }
.log-table small { display:block; color:#83918e; font-size:10px; }
.measurement-list { display:grid; grid-template-columns:repeat(2,minmax(120px,1fr)); gap:3px 12px; min-width:290px; }
.measurement-list span { color:#34514c; white-space:nowrap; }
.note-cell { max-width:220px; }
.empty-row { height:100px; color:#83918e !important; text-align:center; }
.table-footer { display:flex; align-items:center; justify-content:space-between; min-height:52px; padding:0 14px; border-top:1px solid #e5eeeb; color:#71827e; font-size:11px; }
.pager { display:flex; align-items:center; gap:8px; }
.form-card { border-radius:8px !important; }
.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }
.form-card :deep(.v-card-text) { padding:12px 22px; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 14px; }
.form-hint { grid-column:1/-1; margin:0; color:#71827e; font-size:11px; }
.full-width { grid-column:1/-1; }
@media(max-width:760px) { .page-heading { align-items:flex-start; flex-direction:column; }.filter-row { grid-template-columns:1fr 1fr; }.filter-row .v-btn { grid-column:1/-1; }.form-grid { grid-template-columns:1fr; }.form-hint,.full-width { grid-column:auto; }.table-wrap { overflow-x:auto; } }
.empty-message { margin: 12px 0; color: #71827e; font-size: 13px; }
</style>
