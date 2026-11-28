<script setup>
import { singleFlight } from '../../../utils/single-flight.js'
import LocalPages from '../../../components/pagination/LocalPages.vue'
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
const farmContext = useFarmContext()
const farms = ref([])
const thresholds = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const dialog = ref(false)
const editingId = ref('')
const formRef = ref(null)
const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const canManage = computed(() => ['OWNER', 'FARM_MANAGER'].includes(selectedFarm.value?.role))
const parameterTitle = (code) => parameters.find((item) => item.value === code)?.title || code
const tankTypeTitle = (code) => tankTypes.find((item) => item.value === code)?.title || code
const speciesTitle = (code) => speciesOptions.find((item) => item.value === code)?.title || code
const dateText = (value) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(value)) : 'Không giới hạn'
const boundText = (item) => [
  item.warningMin !== null ? `Cảnh báo dưới ${item.warningMin}` : '',
  item.warningMax !== null ? `Cảnh báo trên ${item.warningMax}` : '',
  item.dangerMin !== null ? `Nguy cấp dưới ${item.dangerMin}` : '',
  item.dangerMax !== null ? `Nguy cấp trên ${item.dangerMax}` : '',
].filter(Boolean).join(' · ')
const blankForm = () => ({
  species: '', developmentStage: '', tankType: '', parameterCode: '', unit: '',
  optimalMin: '', optimalMax: '', warningMin: '', warningMax: '', dangerMin: '', dangerMax: '',
  effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: '',
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
  if (!farmId.value) { thresholds.value = []; return }
  thresholds.value = (await api(farmUrl('/environment-thresholds'))).data
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
    effectiveFrom: new Date(item.effectiveFrom).toISOString().slice(0, 10),
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
watch(farmId, async () => {
  if (!loading.value) {
    try { await loadData() } catch (err) { error.value = err.message; showToast(err.message, 'error') }
  }
})
onMounted(loadPage)
</script>

<template>
<section class="threshold-page">
      <header class="care-panel-heading threshold-heading"><div class="care-panel-title"><span class="care-panel-icon"><v-icon icon="mdi-tune-variant" size="24" /></span><h2>Ngưỡng môi trường</h2></div>      <div class="page-actions list-actions"><v-btn v-if="canManage" color="primary" prepend-icon="mdi-plus" @click="openCreate">Thêm ngưỡng</v-btn></div></header>
      <v-card class="list-card care-list-card" elevation="0">
      <LoadingIndicator v-if="loading" />
      <div v-else-if="error" class="state-message error-state">{{ error }}</div>
      <template v-else>
        <section class="section-block">
          <p v-if="!thresholds.length" class="empty-message">Chưa có ngưỡng môi trường cho trang trại này.</p>
          <div v-else class="table-wrap"><LocalPages :items="thresholds || []" v-slot="{ rows: pageRows }">
<v-table density="comfortable" class="mobile-records app-data-table threshold-table">
            <thead><tr><th>Thông số</th><th>Điều kiện áp dụng</th><th>Giới hạn cảnh báo</th><th>Hiệu lực</th><th>Trạng thái</th><th v-if="canManage">Thao tác</th></tr></thead>
            <tbody>
              <tr v-for="item in pageRows" :key="item.id">
                <td data-label="Thông số"><strong>{{ parameterTitle(item.parameterCode) }}</strong><small>Đơn vị: {{ item.unit || 'không có' }}</small></td>
                <td data-label="Điều kiện áp dụng">{{ speciesTitle(item.species) }} · {{ item.developmentStage }}<small>{{ tankTypeTitle(item.tankType) }}</small></td>
                <td data-label="Giới hạn cảnh báo">{{ boundText(item) }}<small v-if="item.optimalMin !== null || item.optimalMax !== null">Tối ưu: {{ item.optimalMin ?? '−∞' }} đến {{ item.optimalMax ?? '+∞' }}</small></td>
                <td data-label="Hiệu lực">{{ dateText(item.effectiveFrom) }}<small>đến {{ dateText(item.effectiveTo) }}</small></td>
                <td data-label="Trạng thái"><span class="status" :class="{ approved: item.approvedAt && item.isActive, inactive: !item.isActive }">{{ !item.isActive ? 'Ngừng áp dụng' : item.approvedAt ? 'Đã duyệt' : 'Chờ duyệt' }}</span></td>
                <td data-label="Thao tác" v-if="canManage" class="actions">
                  <v-btn icon="mdi-pencil-outline" size="small" variant="text" aria-label="Sửa ngưỡng" title="Sửa ngưỡng" @click="openEdit(item)" />
                  <v-btn v-if="!item.approvedAt" icon="mdi-check-decagram-outline" size="small" variant="text" aria-label="Duyệt ngưỡng" title="Duyệt và kích hoạt" @click="approve(item)" />
                  <v-btn v-else :icon="item.isActive ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline'" size="small" variant="text" :aria-label="item.isActive ? 'Ngừng áp dụng' : 'Kích hoạt'" :title="item.isActive ? 'Ngừng áp dụng' : 'Kích hoạt'" @click="setActive(item, !item.isActive)" />
                </td>
              </tr>
            </tbody>
          </v-table>
</LocalPages></div>
        </section>
      </template>
      </v-card>

<v-dialog v-model="dialog" max-width="900"><v-card class="form-card">
          <v-btn class="form-dialog-close" type="button" icon="mdi-close" size="small" variant="text" aria-label="Đóng form" :disabled="saving" @click="dialog = false" />
          <v-card-title>{{ editingId ? 'Cập nhật ngưỡng môi trường' : 'Thêm ngưỡng môi trường' }}</v-card-title>
        <v-card-text><p class="form-note">Ngưỡng mới sẽ ở trạng thái chờ Owner duyệt. Sửa ngưỡng đã duyệt sẽ ngừng áp dụng cấu hình cũ cho đến khi được duyệt lại.</p>
          <v-form ref="formRef" @submit.prevent="singleFlight(saveThreshold, $event)"><div class="form-grid">
            <v-select v-model="form.species" :items="speciesOptions" item-title="title" item-value="value" label="Loài *" :rules="[requiredRule]" />
            <v-combobox v-model="form.developmentStage" :items="stageOptions" label="Giai đoạn *" />
            <v-select v-model="form.tankType" :items="tankTypes" item-title="title" item-value="value" label="Loại ao/bể *" :rules="[requiredRule]" />
            <v-select :model-value="form.parameterCode" :items="parameters" item-title="title" item-value="value" label="Thông số *" :rules="[requiredRule]" @update:model-value="changeParameter" />
            <v-text-field v-model="form.unit" label="Đơn vị *" maxlength="20" :rules="[requiredRule]" />
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
.threshold-page { color: #173f3a; }
.table-wrap { overflow: auto; border: 1px solid #dbe9e5; border-radius: 8px; background: #fff; }
.threshold-table :deep(th) { color: #617d86; font-size: 11px; font-weight: 700; white-space: nowrap; }
.threshold-table :deep(td) { color: #34514c; font-size: 13px; vertical-align: top; }
.threshold-table small { display: block; margin-top: 4px; color: #617d86; font-size: 11px; }
.status { display: inline-flex; padding: 5px 8px; border-radius: 5px; color: #865f12; background: #fff4d4; font-size: 11px; font-weight: 700; }
.status.approved { color: #087561; background: #e2f5ef; }
.status.inactive { color: #64716e; background: #edf1ef; }
.actions { white-space: nowrap; }
.state-message { padding: 28px 16px; color: #617d86; text-align: center; font-size: 13px; }
.error-state { color: #a33b3b; }
.form-card { border-radius: 12px !important; }
.form-card :deep(.v-card-title) { padding: 20px 22px 8px; font-size: 18px; font-weight: 700; white-space: normal; }
.form-card :deep(.v-card-text) { padding: 12px 22px; }
.form-note { margin: 0 0 14px; color: #617d86; font-size: 12px; line-height: 1.55; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 14px; }
.empty-message { margin: 12px 0; color: #617d86; font-size: 13px; }
@media (max-width: 760px) { .form-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
