<script setup>
import Pagination from '../../../components/pagination/index.vue'
import LoadingIndicator from '../../../components/loading/index.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { selectFarm, useFarmContext } from '../../../composables/farm-context.js'
import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'

const parameters = [
  { title: 'Nhiệt độ', value: 'temperature', unit: '°C' }, { title: 'pH', value: 'ph', unit: 'pH' },
  { title: 'Độ mặn', value: 'salinity', unit: 'ppt' }, { title: 'Oxy hòa tan (DO)', value: 'do', unit: 'mg/L' },
  { title: 'NH3', value: 'nh3', unit: 'mg/L' }, { title: 'TAN', value: 'tan', unit: 'mg/L' },
  { title: 'NO2', value: 'no2', unit: 'mg/L' }, { title: 'Nitrate', value: 'nitrate', unit: 'mg/L' },
  { title: 'Độ kiềm', value: 'alkalinity', unit: 'mg/L CaCO3' }, { title: 'H2S', value: 'h2s', unit: 'ppm' },
  { title: 'Độ đục', value: 'turbidity', unit: '' }, { title: 'Mực nước', value: 'water_level', unit: 'm' },
]
const speciesOptions = [
  { title: 'Tất cả loài', value: 'all' }, { title: 'Tôm thẻ chân trắng', value: 'white_leg_shrimp' },
  { title: 'Tôm sú', value: 'black_tiger_shrimp' },
]
const stageOptions = ['all', 'PL10', 'PL12', 'PL15', 'PL20', 'PL12-PL20', 'PL20-PL30']
const tankTypes = [
  { title: 'Tất cả loại ao/bể', value: 'all' }, { title: 'Bể ương', value: 'nursery_tank' },
  { title: 'Ao nuôi', value: 'pond' }, { title: 'Khác', value: 'other' },
]
const severityFilters = [
  { title: 'Tất cả mức độ', value: '' }, { title: 'Cảnh báo', value: 'warning' }, { title: 'Nguy cấp', value: 'critical' },
]
const readFilters = [
  { title: 'Tất cả trạng thái', value: '' }, { title: 'Chưa đọc', value: 'false' }, { title: 'Đã đọc', value: 'true' },
]
const farmContext = useFarmContext()
const farms = ref([])
const thresholds = ref([])
const alerts = ref([])
const alertFilters = ref({ severity: '', isRead: '' })
const alertPage = ref(1)
const alertSize = ref(10)
const alertPagination = ref({ total: 0, pageCount: 1 })
const alertsLoading = ref(false)
const detailDialog = ref(false)
const detailLoading = ref(false)
const selectedAlert = ref(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const dialog = ref(false)
const editingId = ref('')
const formRef = ref(null)
const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const canManage = computed(() => selectedFarm.value?.role === 'owner')
const parameterTitle = (code) => parameters.find((item) => item.value === code)?.title || code
const tankTypeTitle = (code) => tankTypes.find((item) => item.value === code)?.title || code
const speciesTitle = (code) => speciesOptions.find((item) => item.value === code)?.title || code
const dateText = (value) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(value)) : 'Không giới hạn'
const dateTimeText = (value) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
const boundText = (item) => [
  item.warningMin !== null ? `Cảnh báo dưới ${item.warningMin}` : '',
  item.warningMax !== null ? `Cảnh báo trên ${item.warningMax}` : '',
  item.dangerMin !== null ? `Nguy cấp dưới ${item.dangerMin}` : '',
  item.dangerMax !== null ? `Nguy cấp trên ${item.dangerMax}` : '',
].filter(Boolean).join(' · ')
const blankForm = () => ({
  species: 'all', developmentStage: 'all', tankType: 'all', parameterCode: 'temperature', unit: '°C',
  optimalMin: '', optimalMax: '', warningMin: '', warningMax: '', dangerMin: '', dangerMax: '',
  sourceReference: '', effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: '',
})
const form = ref(blankForm())
const requiredRule = (value) => Boolean(String(value ?? '').trim()) || 'Trường này là bắt buộc.'
const boundRule = (value) => value === '' || (Number.isFinite(Number(value)) && Math.abs(Number(value) * 1000 - Math.round(Number(value) * 1000)) < 1e-7) || 'Nhập số hợp lệ, tối đa 3 chữ số thập phân.'

function farmUrl(path) { return `/farms/${encodeURIComponent(farmId.value)}${path}` }
async function loadFarms() {
  farms.value = (await api('/farms')).data
  farmContext.farms = farms.value
  farmContext.ready = true
  if (!farms.value.some((item) => item.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
}
async function loadData() {
  if (!farmId.value) { thresholds.value = []; alerts.value = []; return }
  const [thresholdResult] = await Promise.all([api(farmUrl('/environment-thresholds')), loadAlerts()])
  thresholds.value = thresholdResult.data
}
function alertQuery() {
  const params = new URLSearchParams({ page: String(alertPage.value), limit: String(alertSize.value) })
  if (alertFilters.value.severity) params.set('severity', alertFilters.value.severity)
  if (alertFilters.value.isRead !== '') params.set('isRead', alertFilters.value.isRead)
  return params.toString()
}
async function loadAlerts() {
  if (!farmId.value) { alerts.value = []; alertPagination.value = { total: 0, pageCount: 1 }; return }
  alertsLoading.value = true
  try {
    const result = await api(farmUrl(`/environment-thresholds/alerts?${alertQuery()}`))
    alerts.value = result.data.items
    alertPagination.value = result.data.pagination
  } finally { alertsLoading.value = false }
}
async function loadPage() {
  loading.value = true
  error.value = ''
  try { await loadFarms(); await loadData() }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
  finally { loading.value = false }
}
function openCreate() { editingId.value = ''; form.value = blankForm(); dialog.value = true }
function openEdit(item) {
  editingId.value = item.id
  form.value = {
    species: item.species, developmentStage: item.developmentStage, tankType: item.tankType,
    parameterCode: item.parameterCode, unit: item.unit,
    optimalMin: item.optimalMin ?? '', optimalMax: item.optimalMax ?? '', warningMin: item.warningMin ?? '',
    warningMax: item.warningMax ?? '', dangerMin: item.dangerMin ?? '', dangerMax: item.dangerMax ?? '',
    sourceReference: item.sourceReference, effectiveFrom: new Date(item.effectiveFrom).toISOString().slice(0, 10),
    effectiveTo: item.effectiveTo ? new Date(item.effectiveTo).toISOString().slice(0, 10) : '',
  }
  dialog.value = true
}
function changeParameter(code) {
  form.value.parameterCode = code
  form.value.unit = parameters.find((item) => item.value === code)?.unit || ''
}
async function saveThreshold() {
  const validation = await formRef.value?.validate()
  if (!validation?.valid) return
  saving.value = true
  try {
    const payload = { ...form.value }
    for (const key of ['optimalMin', 'optimalMax', 'warningMin', 'warningMax', 'dangerMin', 'dangerMax']) payload[key] = payload[key] === '' ? null : Number(payload[key])
    payload.effectiveTo = payload.effectiveTo || null
    await api(farmUrl(`/environment-thresholds${editingId.value ? `/${editingId.value}` : ''}`), {
      method: editingId.value ? 'PATCH' : 'POST', body: JSON.stringify(payload),
    })
    dialog.value = false
    showToast(editingId.value ? 'Đã cập nhật ngưỡng. Cấu hình cần được duyệt lại.' : 'Đã tạo ngưỡng ở trạng thái chờ duyệt.', 'success')
    await loadData()
  } catch (err) { showToast(err.message, 'error') }
  finally { saving.value = false }
}
async function approve(item) {
  try {
    await api(farmUrl(`/environment-thresholds/${item.id}/approve`), { method: 'POST' })
    showToast('Đã phê duyệt và kích hoạt ngưỡng.', 'success')
    await loadData()
  } catch (err) { showToast(err.message, 'error') }
}
async function setActive(item, isActive) {
  try {
    await api(farmUrl(`/environment-thresholds/${item.id}/status`), { method: 'PATCH', body: JSON.stringify({ isActive }) })
    showToast(isActive ? 'Đã kích hoạt ngưỡng.' : 'Đã ngừng áp dụng ngưỡng.', 'success')
    await loadData()
  } catch (err) { showToast(err.message, 'error') }
}
async function applyAlertFilters() {
  alertPage.value = 1
  try { await loadAlerts() } catch (err) { showToast(err.message, 'error') }
}
async function viewAlert(item) {
  detailDialog.value = true
  detailLoading.value = true
  selectedAlert.value = null
  try {
    const result = await api(farmUrl(`/environment-thresholds/alerts/${item.id}`))
    selectedAlert.value = result.data
  } catch (err) {
    detailDialog.value = false
    showToast(err.message, 'error')
  } finally { detailLoading.value = false }
}
async function markAlertRead(item) {
  try {
    const result = await api(farmUrl(`/environment-thresholds/alerts/${item.id}/read`), { method: 'PATCH' })
    if (selectedAlert.value?.id === item.id) selectedAlert.value = { ...selectedAlert.value, ...result.data, isRead: true }
    alertPage.value = 1
    await loadAlerts()
    showToast('Đã đánh dấu cảnh báo là đã đọc.', 'success')
  } catch (err) { showToast(err.message, 'error') }
}
function changeAlertPage(nextPage) {
  alertPage.value = nextPage
  loadAlerts().catch((err) => showToast(err.message, 'error'))
}
watch(farmId, async () => {
  if (!loading.value) {
    try { await loadData() } catch (err) { error.value = err.message; showToast(err.message, 'error') }
  }
})
onMounted(loadPage)
watch(() => [alertFilters.value.severity, alertFilters.value.isRead], applyAlertFilters)
watch(alertSize, applyAlertFilters)
</script>

<template>
<section class="threshold-page">
      <div class="page-actions list-actions"><v-btn v-if="canManage" color="primary" prepend-icon="mdi-plus" @click="openCreate">Thêm ngưỡng</v-btn></div>
      <v-card class="list-card care-list-card" elevation="0">
      <LoadingIndicator v-if="loading" />
      <div v-else-if="error" class="state-message error-state">{{ error }}</div>
      <template v-else>
        <section class="section-block">
          <p v-if="!thresholds.length" class="empty-message">Chưa có ngưỡng môi trường cho trang trại này.</p>
          <div v-else class="table-wrap"><v-table density="comfortable" class="app-data-table threshold-table">
            <thead><tr><th>Thông số</th><th>Điều kiện áp dụng</th><th>Giới hạn cảnh báo</th><th>Nguồn tham chiếu</th><th>Hiệu lực</th><th>Trạng thái</th><th v-if="canManage">Thao tác</th></tr></thead>
            <tbody>
              <tr v-for="item in thresholds" :key="item.id">
                <td><strong>{{ parameterTitle(item.parameterCode) }}</strong><small>Đơn vị: {{ item.unit || 'không có' }}</small></td>
                <td>{{ speciesTitle(item.species) }} · {{ item.developmentStage }}<small>{{ tankTypeTitle(item.tankType) }}</small></td>
                <td>{{ boundText(item) }}<small v-if="item.optimalMin !== null || item.optimalMax !== null">Tối ưu: {{ item.optimalMin ?? '−∞' }} đến {{ item.optimalMax ?? '+∞' }}</small></td>
                <td class="source-cell">{{ item.sourceReference }}</td>
                <td>{{ dateText(item.effectiveFrom) }}<small>đến {{ dateText(item.effectiveTo) }}</small></td>
                <td><span class="status" :class="{ approved: item.approvedAt && item.isActive, inactive: !item.isActive }">{{ !item.isActive ? 'Ngừng áp dụng' : item.approvedAt ? 'Đã duyệt' : 'Chờ duyệt' }}</span></td>
                <td v-if="canManage" class="actions">
                  <v-btn icon="mdi-pencil-outline" size="small" variant="text" aria-label="Sửa ngưỡng" title="Sửa ngưỡng" @click="openEdit(item)" />
                  <v-btn v-if="!item.approvedAt" icon="mdi-check-decagram-outline" size="small" variant="text" aria-label="Duyệt ngưỡng" title="Duyệt và kích hoạt" @click="approve(item)" />
                  <v-btn v-else :icon="item.isActive ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline'" size="small" variant="text" :aria-label="item.isActive ? 'Ngừng áp dụng' : 'Kích hoạt'" :title="item.isActive ? 'Ngừng áp dụng' : 'Kích hoạt'" @click="setActive(item, !item.isActive)" />
                </td>
              </tr>
            </tbody>
          </v-table></div>
        </section>
        <section class="section-block alerts-block">
          <div class="alert-filters">
            <v-select v-model="alertFilters.severity" :items="severityFilters" item-title="title" item-value="value" label="Mức độ" density="compact" variant="outlined" hide-details />
            <v-select v-model="alertFilters.isRead" :items="readFilters" item-title="title" item-value="value" label="Trạng thái đã đọc" density="compact" variant="outlined" hide-details />
          </div>
          <div v-if="!alerts.length" class="empty-message">Chưa phát sinh cảnh báo môi trường.</div>
          <div v-else class="table-wrap"><v-table class="app-data-table" density="comfortable">
            <thead><tr><th>Thời gian</th><th>Ao/bể</th><th>Cảnh báo</th><th>Mức độ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody><tr v-for="item in alerts" :key="item.id">
              <td>{{ dateTimeText(item.createdAt) }}</td>
              <td>{{ item.tank?.name || 'Ao/bể' }}</td>
              <td><strong>{{ item.title }}</strong><small>{{ item.message }}</small></td>
              <td><v-chip size="small" variant="tonal" :color="item.severity === 'critical' ? 'error' : 'warning'">{{ item.severity === 'critical' ? 'Nguy cấp' : 'Cảnh báo' }}</v-chip></td>
              <td>{{ item.isRead ? 'Đã đọc' : 'Chưa đọc' }}</td>
              <td class="actions"><v-btn size="small" variant="text" icon="mdi-eye-outline" aria-label="Chi tiết cảnh báo" @click="viewAlert(item)" /><v-btn v-if="!item.isRead" size="small" variant="text" icon="mdi-check" aria-label="Đánh dấu đã đọc" @click="markAlertRead(item)" /></td>
            </tr></tbody>
          </v-table></div>
          <Pagination :page="alertPage" v-model:page-size="alertSize" :total="alertPagination.total" :loading="alertsLoading" @update:page="changeAlertPage" />
        </section>
      </template>
      </v-card>

      <v-dialog v-model="detailDialog" max-width="680"><v-card class="detail-card">
        <v-card-title>Chi tiết cảnh báo</v-card-title>
        <v-card-text>
          <LoadingIndicator v-if="detailLoading" />
          <div v-else-if="selectedAlert" class="detail-content">
            <div class="detail-title-row"><div><span class="severity-label" :class="selectedAlert.severity">{{ selectedAlert.severity === 'critical' ? 'Nguy cấp' : 'Cảnh báo' }}</span><h3>{{ selectedAlert.title }}</h3></div><span class="read-state">{{ selectedAlert.isRead ? 'Đã đọc' : 'Chưa đọc' }}</span></div>
            <p class="detail-message">{{ selectedAlert.message }}</p>
            <dl class="detail-grid">
              <div><dt>Ao/bể</dt><dd>{{ selectedAlert.tank?.name || 'Không còn liên kết' }} <small v-if="selectedAlert.tank">({{ selectedAlert.tank.code }})</small></dd></div>
              <div><dt>Thời điểm cảnh báo</dt><dd>{{ dateTimeText(selectedAlert.createdAt) }}</dd></div>
              <div><dt>Thông số / giá trị</dt><dd>{{ parameterTitle(selectedAlert.parameterCode) }}: {{ selectedAlert.observedValue }} {{ selectedAlert.threshold?.unit }}</dd></div>
              <div><dt>Lô giống</dt><dd>{{ selectedAlert.batch?.batchCode || 'Không có lô đang chiếm dụng' }}</dd></div>
              <div><dt>Quy tắc áp dụng</dt><dd>{{ selectedAlert.threshold ? `${speciesTitle(selectedAlert.threshold.species)} · ${selectedAlert.threshold.developmentStage} · ${tankTypeTitle(selectedAlert.threshold.tankType)}` : 'Không còn thông tin ngưỡng' }}</dd></div>
              <div><dt>Giới hạn ngưỡng</dt><dd>{{ selectedAlert.threshold ? boundText(selectedAlert.threshold) : '—' }}</dd></div>
              <div v-if="selectedAlert.threshold" class="detail-wide"><dt>Nguồn tham chiếu</dt><dd>{{ selectedAlert.threshold.sourceReference }}</dd></div>
              <div v-if="selectedAlert.sourceLog" class="detail-wide"><dt>Phương pháp đo</dt><dd>{{ selectedAlert.sourceLog.measurementMethod }}<span v-if="selectedAlert.sourceLog.measurementDevice"> · {{ selectedAlert.sourceLog.measurementDevice }}</span></dd></div>
            </dl>
          </div>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn v-if="selectedAlert && !selectedAlert.isRead" variant="tonal" prepend-icon="mdi-check" @click="markAlertRead(selectedAlert)">Đánh dấu đã đọc</v-btn><v-btn variant="text" @click="detailDialog = false">Đóng</v-btn></v-card-actions>
      </v-card></v-dialog>
<v-dialog v-model="dialog" max-width="900"><v-card class="form-card">
        <v-card-title>{{ editingId ? 'Cập nhật ngưỡng môi trường' : 'Thêm ngưỡng môi trường' }}</v-card-title>
        <v-card-text><p class="form-note">Ngưỡng mới sẽ ở trạng thái chờ Owner duyệt. Sửa ngưỡng đã duyệt sẽ ngừng áp dụng cấu hình cũ cho đến khi được duyệt lại.</p>
          <v-form ref="formRef" @submit.prevent="saveThreshold"><div class="form-grid">
            <v-select v-model="form.species" :items="speciesOptions" item-title="title" item-value="value" label="Loài *" />
            <v-combobox v-model="form.developmentStage" :items="stageOptions" label="Giai đoạn *" />
            <v-select v-model="form.tankType" :items="tankTypes" item-title="title" item-value="value" label="Loại ao/bể *" />
            <v-select :model-value="form.parameterCode" :items="parameters" item-title="title" item-value="value" label="Thông số *" @update:model-value="changeParameter" />
            <v-text-field v-model="form.unit" label="Đơn vị *" maxlength="20" :rules="[requiredRule]" />
            <v-text-field v-model="form.sourceReference" label="Nguồn tham chiếu/quyết định *" maxlength="4000" :rules="[requiredRule]" />
            <v-text-field v-model="form.optimalMin" type="number" step="0.001" label="Tối ưu từ" :rules="[boundRule]" />
            <v-text-field v-model="form.optimalMax" type="number" step="0.001" label="Tối ưu đến" :rules="[boundRule]" />
            <v-text-field v-model="form.warningMin" type="number" step="0.001" label="Cảnh báo dưới" :rules="[boundRule]" />
            <v-text-field v-model="form.warningMax" type="number" step="0.001" label="Cảnh báo trên" :rules="[boundRule]" />
            <v-text-field v-model="form.dangerMin" type="number" step="0.001" label="Nguy cấp dưới" :rules="[boundRule]" />
            <v-text-field v-model="form.dangerMax" type="number" step="0.001" label="Nguy cấp trên" :rules="[boundRule]" />
            <v-text-field v-model="form.effectiveFrom" type="date" label="Có hiệu lực từ *" :rules="[requiredRule]" />
            <v-text-field v-model="form.effectiveTo" type="date" label="Có hiệu lực đến" />
          </div></v-form>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" :disabled="saving" @click="dialog = false">Hủy</v-btn><v-btn color="primary" :loading="saving" @click="saveThreshold">Lưu cấu hình</v-btn></v-card-actions>
      </v-card></v-dialog>

    </section>
</template>

<style scoped>
.threshold-page { color:#173f3a; }.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:26px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; } h2 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { max-width:720px; margin:8px 0 0; color:#71827e; font-size:13px; line-height:1.6; }.section-block { margin-bottom:22px; }
.section-heading { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }.section-heading h2 { margin:0; font-size:17px; }.section-heading p { margin:5px 0 0; color:#71827e; font-size:12px; }
.table-wrap { overflow:auto; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }.threshold-table :deep(th) { color:#71827e; font-size:10px; font-weight:800; text-transform:uppercase; white-space:nowrap; }
.threshold-table :deep(td) { min-width:120px; color:#34514c; font-size:12px; vertical-align:top; }.threshold-table small { display:block; margin-top:4px; color:#83918e; font-size:10px; }
.source-cell { min-width:180px !important; max-width:260px; overflow-wrap:anywhere; }
.status,.severity-label { display:inline-flex; padding:5px 8px; border-radius:5px; color:#865f12; background:#fff4d4; font-size:10px; font-weight:700; white-space:nowrap; }.status.approved { color:#087561; background:#e2f5ef; }.status.inactive { color:#64716e; background:#edf1ef; }.actions { white-space:nowrap; }
.empty-row,.empty-alerts,.state-message { padding:28px 16px; color:#71827e; text-align:center; }.empty-alerts,.state-message { border:1px solid #dbe9e5; border-radius:8px; background:#fff; font-size:13px; }.error-state { color:#a33b3b; }
.alert-filters { display:grid; grid-template-columns:minmax(180px,1fr) minmax(180px,1fr) auto; align-items:center; gap:10px; margin-bottom:12px; }
.alert-list { display:grid; gap:8px; }.alert-row { display:flex; align-items:flex-start; gap:12px; padding:14px 16px; border:1px solid #e8dcae; border-left:4px solid #d6a124; border-radius:6px; background:#fff; }.alert-row.critical { border-color:#edc9c5; border-left-color:#bd493f; }.alert-row.unread { box-shadow:inset 3px 0 #078575; }
.alert-actions { order:3; display:flex; flex-wrap:wrap; justify-content:flex-end; gap:2px; margin-left:auto; }
.alert-pager { display:flex; align-items:center; justify-content:center; gap:12px; margin-top:12px; color:#71827e; font-size:12px; }
.severity-dot { width:9px; height:9px; margin-top:5px; border-radius:50%; background:#d6a124; flex:0 0 9px; }.critical .severity-dot { background:#bd493f; }.alert-copy { min-width:0; flex:1; }.alert-copy strong { color:#294842; font-size:12px; }
.alert-copy p { margin:4px 0; color:#5e716d; font-size:12px; overflow-wrap:anywhere; }.alert-copy small { color:#83918e; font-size:10px; }.severity-label { color:#865f12; background:#fff4d4; }.critical .severity-label { color:#a33b3b; background:#fbe9e7; }
.form-card { border-radius:8px !important; }.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }.form-card :deep(.v-card-text) { padding:12px 22px; }
.form-note { margin:0 0 14px; color:#71827e; font-size:12px; line-height:1.55; }.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 14px; }
.detail-card { border-radius:8px !important; }.detail-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }.detail-card :deep(.v-card-text) { padding:14px 22px; }
.detail-loading { padding:24px 0; color:#71827e; text-align:center; }.detail-title-row { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }.detail-title-row h3 { margin:10px 0 0; font-size:17px; }.read-state { color:#71827e; font-size:11px; }
.detail-message { margin:14px 0; color:#5e716d; font-size:13px; line-height:1.6; }.detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin:0; padding-top:14px; border-top:1px solid #e5eeeb; }.detail-grid div { min-width:0; }
.detail-grid dt { margin-bottom:4px; color:#83918e; font-size:10px; font-weight:800; text-transform:uppercase; }.detail-grid dd { margin:0; color:#294842; font-size:12px; overflow-wrap:anywhere; }.detail-grid dd small { color:#71827e; }.detail-wide { grid-column:1/-1; }
@media(max-width:760px) { .page-heading { align-items:flex-start; flex-direction:column; }.form-grid { grid-template-columns:1fr; }.threshold-table { min-width:850px; }.alert-row { padding:12px; flex-wrap:wrap; }.alert-filters { grid-template-columns:1fr 1fr; }.alert-filters .v-btn { grid-column:1/-1; }.alert-actions { width:100%; justify-content:flex-start; }.alert-row > .severity-label { display:none; }.detail-grid { grid-template-columns:1fr; }.detail-wide { grid-column:auto; } }
.empty-message { margin: 12px 0; color: #71827e; font-size: 13px; }

.threshold-page { color:#173f3a; }.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:26px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; } h2 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { max-width:720px; margin:8px 0 0; color:#71827e; font-size:13px; line-height:1.6; }.section-block { margin-bottom:22px; }
.section-heading { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }.section-heading h2 { margin:0; font-size:17px; }.section-heading p { margin:5px 0 0; color:#71827e; font-size:12px; }
.table-wrap { overflow:auto; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }.threshold-table :deep(th) { color:#71827e; font-size:10px; font-weight:800; text-transform:uppercase; white-space:nowrap; }
.threshold-table :deep(td) { min-width:120px; color:#34514c; font-size:12px; vertical-align:top; }.threshold-table small { display:block; margin-top:4px; color:#83918e; font-size:10px; }
.source-cell { min-width:180px !important; max-width:260px; overflow-wrap:anywhere; }
.status,.severity-label { display:inline-flex; padding:5px 8px; border-radius:5px; color:#865f12; background:#fff4d4; font-size:10px; font-weight:700; white-space:nowrap; }.status.approved { color:#087561; background:#e2f5ef; }.status.inactive { color:#64716e; background:#edf1ef; }.actions { white-space:nowrap; }
.empty-row,.empty-alerts,.state-message { padding:28px 16px; color:#71827e; text-align:center; }.empty-alerts,.state-message { border:1px solid #dbe9e5; border-radius:8px; background:#fff; font-size:13px; }.error-state { color:#a33b3b; }
.alert-filters { display:grid; grid-template-columns:minmax(180px,1fr) minmax(180px,1fr) auto; align-items:center; gap:10px; margin-bottom:12px; }
.alert-list { display:grid; gap:8px; }.alert-row { display:flex; align-items:flex-start; gap:12px; padding:14px 16px; border:1px solid #e8dcae; border-left:4px solid #d6a124; border-radius:6px; background:#fff; }.alert-row.critical { border-color:#edc9c5; border-left-color:#bd493f; }.alert-row.unread { box-shadow:inset 3px 0 #078575; }
.alert-actions { order:3; display:flex; flex-wrap:wrap; justify-content:flex-end; gap:2px; margin-left:auto; }
.alert-pager { display:flex; align-items:center; justify-content:center; gap:12px; margin-top:12px; color:#71827e; font-size:12px; }
.severity-dot { width:9px; height:9px; margin-top:5px; border-radius:50%; background:#d6a124; flex:0 0 9px; }.critical .severity-dot { background:#bd493f; }.alert-copy { min-width:0; flex:1; }.alert-copy strong { color:#294842; font-size:12px; }
.alert-copy p { margin:4px 0; color:#5e716d; font-size:12px; overflow-wrap:anywhere; }.alert-copy small { color:#83918e; font-size:10px; }.severity-label { color:#865f12; background:#fff4d4; }.critical .severity-label { color:#a33b3b; background:#fbe9e7; }
.form-card { border-radius:8px !important; }.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }.form-card :deep(.v-card-text) { padding:12px 22px; }
.form-note { margin:0 0 14px; color:#71827e; font-size:12px; line-height:1.55; }.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 14px; }
.detail-card { border-radius:8px !important; }.detail-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }.detail-card :deep(.v-card-text) { padding:14px 22px; }
.detail-loading { padding:24px 0; color:#71827e; text-align:center; }.detail-title-row { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }.detail-title-row h3 { margin:10px 0 0; font-size:17px; }.read-state { color:#71827e; font-size:11px; }
.detail-message { margin:14px 0; color:#5e716d; font-size:13px; line-height:1.6; }.detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin:0; padding-top:14px; border-top:1px solid #e5eeeb; }.detail-grid div { min-width:0; }
.detail-grid dt { margin-bottom:4px; color:#83918e; font-size:10px; font-weight:800; text-transform:uppercase; }.detail-grid dd { margin:0; color:#294842; font-size:12px; overflow-wrap:anywhere; }.detail-grid dd small { color:#71827e; }.detail-wide { grid-column:1/-1; }
@media(max-width:760px) { .page-heading { align-items:flex-start; flex-direction:column; }.form-grid { grid-template-columns:1fr; }.threshold-table { min-width:850px; }.alert-row { padding:12px; flex-wrap:wrap; }.alert-filters { grid-template-columns:1fr 1fr; }.alert-filters .v-btn { grid-column:1/-1; }.alert-actions { width:100%; justify-content:flex-start; }.alert-row > .severity-label { display:none; }.detail-grid { grid-template-columns:1fr; }.detail-wide { grid-column:auto; } }
.empty-message { margin: 12px 0; color: #71827e; font-size: 13px; }
</style>
