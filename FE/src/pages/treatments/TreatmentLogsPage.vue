<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const farms = ref([])
const tanks = ref([])
const supplies = ref([])
const logs = ref([])
const pagination = ref({ total: 0, pageCount: 1 })
const loading = ref(true)
const listLoading = ref(false)
const saving = ref(false)
const error = ref('')
const dialog = ref(false)
const formRef = ref(null)
const page = ref(1)
const filters = ref({ tankId: '', from: '', to: '' })
const form = ref(emptyForm())

const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const canRecord = computed(() => ['owner', 'area_manager', 'technician'].includes(selectedFarm.value?.role))
const pageCount = computed(() => Math.max(1, pagination.value.pageCount || 1))
const tankRule = (value) => Boolean(value) || 'Vui lòng chọn ao/bể.'
const requiredText = (label, max) => (value) => Boolean(value?.trim()) && value.trim().length <= max || `${label} là bắt buộc và tối đa ${max} ký tự.`
const amountRule = (value) => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 999_999_999.999 && Math.abs(Number(value) * 1000 - Math.round(Number(value) * 1000)) < 1e-7 || 'Liều lượng phải lớn hơn 0, tối đa 3 chữ số thập phân.'
const dateRule = (value) => Boolean(value) && !Number.isNaN(new Date(value).getTime()) || 'Thời điểm thực hiện không hợp lệ.'

function emptyForm() {
  return { tankId: '', supplyId: '', productName: '', amount: '', unit: '', purpose: '', performedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), notes: '' }
}
function farmUrl(suffix = '') { return `/farms/${encodeURIComponent(farmId.value)}${suffix}` }
function formatNumber(value) { return Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 }) }
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

async function loadReferenceData() {
  tanks.value = []
  supplies.value = []
  if (!farmId.value) return
  const categories = ['medicine', 'chemical', 'probiotic']
  const [tankResult, ...supplyResults] = await Promise.all([
    api(farmUrl('/ponds-tanks')),
    ...categories.map((category) => api(farmUrl(`/inventory-supplies?category=${category}&limit=100`))),
  ])
  tanks.value = tankResult.data
  supplies.value = supplyResults.flatMap((result) => result.data.items)
}

function buildQuery() {
  const params = new URLSearchParams({ page: String(page.value), limit: '50' })
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
    const result = await api(farmUrl(`/treatment-logs?${buildQuery()}`))
    logs.value = result.data.items
    pagination.value = result.data.pagination
  } catch (err) { logs.value = []; error.value = err.message; showToast(err.message, 'error') }
  finally { listLoading.value = false }
}

async function loadPage() {
  loading.value = true
  error.value = ''
  try { await loadFarms(); await Promise.all([loadReferenceData(), loadLogs()]) }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
  finally { loading.value = false }
}

function selectSupply(id) {
  form.value.supplyId = id || ''
  const supply = supplies.value.find((item) => item.id === id)
  if (supply) { form.value.productName = supply.name; form.value.unit = supply.unit }
}
function openCreate() { form.value = { ...emptyForm(), tankId: filters.value.tankId || tanks.value[0]?.id || '' }; dialog.value = true }

async function saveLog() {
  const validation = await formRef.value?.validate()
  if (!validation?.valid) return showToast('Vui lòng kiểm tra các trường chưa hợp lệ.', 'error')
  if (form.value.notes.length > 4000) return showToast('Ghi chú tối đa 4.000 ký tự.', 'error')
  saving.value = true
  try {
    await api(farmUrl('/treatment-logs'), {
      method: 'POST',
      body: JSON.stringify({
        tankId: form.value.tankId, supplyId: form.value.supplyId || null,
        productName: form.value.productName.trim(), amount: Number(form.value.amount), unit: form.value.unit.trim(),
        purpose: form.value.purpose.trim(), performedAt: new Date(form.value.performedAt).toISOString(),
        notes: form.value.notes.trim() || null,
      }),
    })
    dialog.value = false
    showToast('Đã ghi nhật ký thuốc/chế phẩm.', 'success')
    await Promise.all([loadLogs(), loadReferenceData()])
  } catch (err) { showToast(err.message, 'error') }
  finally { saving.value = false }
}

function applyFilters() { page.value = 1; loadLogs() }
watch(farmId, async () => {
  page.value = 1
  filters.value.tankId = ''
  try { await Promise.all([loadReferenceData(), loadLogs()]) }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
})
onMounted(loadPage)
</script>

<template>
  <AppShell>
    <section class="treatment-page">
      <header class="page-heading">
        <div><p class="eyebrow">CHĂM SÓC · UC05.6</p><h1>Nhật ký thuốc/chế phẩm</h1><p class="subtitle">Theo dõi sản phẩm, liều lượng, mục đích và lịch sử xử lý theo ao/bể.</p></div>
        <v-btn color="primary" prepend-icon="mdi-plus" :disabled="!canRecord || !tanks.length" @click="openCreate">Ghi nhận xử lý</v-btn>
      </header>
      <div class="filter-row">
        <v-select v-model="filters.tankId" :items="tanks" item-title="name" item-value="id" label="Ao/bể" clearable density="comfortable" variant="outlined" hide-details />
        <v-text-field v-model="filters.from" type="date" label="Từ ngày" density="comfortable" variant="outlined" hide-details />
        <v-text-field v-model="filters.to" type="date" label="Đến ngày" density="comfortable" variant="outlined" hide-details />
        <v-btn variant="tonal" prepend-icon="mdi-magnify" :loading="listLoading" @click="applyFilters">Lọc</v-btn>
      </div>
      <div v-if="loading" class="state-message">Đang tải nhật ký...</div>
      <div v-else-if="error" class="state-message error-state" role="alert">{{ error }}</div>
      <div v-else-if="!farmId" class="state-message">Chọn trang trại để xem nhật ký.</div>
      <div v-else class="table-wrap">
        <v-table class="log-table" density="comfortable">
          <thead><tr><th>Thời điểm</th><th>Ao/bể</th><th>Thuốc/chế phẩm</th><th>Liều lượng</th><th>Mục đích</th><th>Người ghi</th><th>Ghi chú</th></tr></thead>
          <tbody>
            <tr v-for="item in logs" :key="item.id">
              <td>{{ formatDateTime(item.performedAt) }}</td><td><strong>{{ item.tank.name }}</strong><small>{{ item.tank.code }}</small></td>
              <td>{{ item.productName }}<small v-if="item.supply">Từ kho · {{ item.supply.category }}</small></td>
              <td>{{ formatNumber(item.amount) }} {{ item.unit }}</td><td class="text-cell">{{ item.purpose }}</td>
              <td>{{ item.performer.displayName || item.performer.email }}</td><td class="text-cell">{{ item.notes || '—' }}</td>
            </tr>
            <tr v-if="!listLoading && !logs.length"><td colspan="7" class="empty-row">Chưa có nhật ký thuốc/chế phẩm phù hợp.</td></tr>
          </tbody>
        </v-table>
        <div class="table-footer"><span>{{ pagination.total }} bản ghi</span><div class="pager"><v-btn icon="mdi-chevron-left" variant="text" aria-label="Trang trước" :disabled="page <= 1 || listLoading" @click="page--; loadLogs()" /><span>{{ page }} / {{ pageCount }}</span><v-btn icon="mdi-chevron-right" variant="text" aria-label="Trang sau" :disabled="page >= pageCount || listLoading" @click="page++; loadLogs()" /></div></div>
      </div>
      <v-dialog v-model="dialog" max-width="680">
        <v-card class="form-card"><v-card-title>Ghi nhật ký thuốc/chế phẩm</v-card-title><v-card-text>
          <v-form ref="formRef" @submit.prevent="saveLog"><div class="form-grid">
            <v-select v-model="form.tankId" :items="tanks" item-title="name" item-value="id" label="Ao/bể *" :rules="[tankRule]" />
            <v-text-field v-model="form.performedAt" type="datetime-local" label="Thời điểm thực hiện *" :rules="[dateRule]" />
            <v-select :model-value="form.supplyId" :items="supplies" item-title="name" item-value="id" label="Lấy sản phẩm từ kho (không bắt buộc)" clearable @update:model-value="selectSupply" />
            <v-text-field v-model="form.productName" label="Tên thuốc/chế phẩm *" maxlength="150" :readonly="Boolean(form.supplyId)" :rules="[requiredText('Tên sản phẩm', 150)]" />
            <v-text-field v-model="form.amount" type="number" min="0.001" max="999999999.999" step="0.001" label="Liều lượng *" :rules="[amountRule]" />
            <v-text-field v-model="form.unit" label="Đơn vị *" maxlength="20" :readonly="Boolean(form.supplyId)" :rules="[requiredText('Đơn vị', 20)]" />
            <v-textarea v-model="form.purpose" label="Mục đích sử dụng *" rows="2" maxlength="4000" counter="4000" class="full-width" :rules="[requiredText('Mục đích', 4000)]" />
            <v-textarea v-model="form.notes" label="Ghi chú" rows="2" maxlength="4000" counter="4000" class="full-width" />
          </div><v-alert v-if="form.supplyId" type="info" variant="tonal" density="compact" class="inventory-hint">Khi lưu, hệ thống kiểm tra tồn và ghi giao dịch sử dụng kho cùng nhật ký trong một thao tác.</v-alert></v-form>
        </v-card-text><v-card-actions><v-spacer /><v-btn variant="text" :disabled="saving" @click="dialog = false">Hủy</v-btn><v-btn color="primary" :loading="saving" @click="saveLog">Lưu nhật ký</v-btn></v-card-actions></v-card>
      </v-dialog>
    </section>
  </AppShell>
</template>

<style scoped>
.treatment-page{color:#173f3a}.page-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:24px}.eyebrow{margin:0 0 8px;color:#078575;font-size:10px;font-weight:800;letter-spacing:1px}h1{margin:0;font-size:29px;line-height:1.2;font-weight:800}.subtitle{margin:8px 0 0;color:#71827e;font-size:13px}.filter-row{display:grid;grid-template-columns:minmax(190px,1.4fr) minmax(150px,1fr) minmax(150px,1fr) auto;align-items:center;gap:12px;margin-bottom:16px}.state-message{padding:34px 20px;border:1px solid #dbe9e5;border-radius:8px;color:#71827e;background:#fff;text-align:center}.error-state{color:#a33b3b}.table-wrap{overflow:hidden;border:1px solid #dbe9e5;border-radius:8px;background:#fff}.log-table :deep(th){color:#71827e;font-size:10px;font-weight:800;text-transform:uppercase;white-space:nowrap}.log-table :deep(td){color:#34514c;font-size:12px;vertical-align:top}.log-table small{display:block;color:#83918e;font-size:10px}.text-cell{max-width:240px;white-space:normal}.empty-row{height:100px;color:#83918e!important;text-align:center}.table-footer{display:flex;align-items:center;justify-content:space-between;min-height:52px;padding:0 14px;border-top:1px solid #e5eeeb;color:#71827e;font-size:11px}.pager{display:flex;align-items:center;gap:8px}.form-card{border-radius:8px!important}.form-card :deep(.v-card-title){padding:20px 22px 8px;font-size:18px;font-weight:800}.form-card :deep(.v-card-text){padding:12px 22px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px}.full-width{grid-column:1/-1}.inventory-hint{margin-top:4px}@media(max-width:760px){.page-heading{align-items:flex-start;flex-direction:column}.filter-row{grid-template-columns:1fr 1fr}.filter-row .v-btn{grid-column:1/-1}.form-grid{grid-template-columns:1fr}.full-width{grid-column:auto}.table-wrap{overflow-x:auto}}
</style>
