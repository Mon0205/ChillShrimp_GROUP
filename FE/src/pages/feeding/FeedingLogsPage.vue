<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const farms = ref([])
const tanks = ref([])
const logs = ref([])
const summary = ref({ amountsByUnit: [], averageFeedingRatePercent: null })
const loading = ref(true)
const listLoading = ref(false)
const saving = ref(false)
const error = ref('')
const formDialog = ref(false)
const formRef = ref(null)
const page = ref(1)
const pageSize = 50
const pagination = ref({ total: 0, pageCount: 1 })
const filters = ref({ tankId: '', from: '', to: '' })
const form = ref(emptyForm())

const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const role = computed(() => selectedFarm.value?.role || '')
const canRecord = computed(() => ['owner', 'area_manager', 'technician'].includes(role.value))
const pageCount = computed(() => Math.max(1, pagination.value.pageCount || 1))
const requiredRule = (label) => (value) => String(value ?? '').trim().length > 0 || `${label} là bắt buộc.`
const positiveNumberRule = (label) => (value) => (value !== '' && Number.isFinite(Number(value)) && Number(value) > 0) || `${label} phải lớn hơn 0.`
const optionalNonNegativeRule = (label) => (value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0) || `${label} không được âm.`
const optionalPositiveRule = (label) => (value) => value === '' || (Number.isFinite(Number(value)) && Number(value) > 0) || `${label} phải lớn hơn 0.`
const feedNameRules = [requiredRule('Tên thức ăn'), (v) => String(v || '').trim().length <= 150 || 'Tên thức ăn tối đa 150 ký tự.']
const amountRules = [requiredRule('Lượng thức ăn'), positiveNumberRule('Lượng thức ăn')]
const unitRules = [requiredRule('Đơn vị'), (v) => String(v || '').trim().length <= 20 || 'Đơn vị tối đa 20 ký tự.']

function emptyForm() {
  return {
    tankId: '', feedName: '', amount: '', unit: 'kg', biomassSnapshotKg: '',
    feedingRatePercent: '', recommendedAmount: '', feedCheckStatus: 'not_checked',
    feedingTime: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), notes: '',
  }
}

function farmUrl(suffix = '') {
  return `/farms/${encodeURIComponent(farmId.value)}${suffix}`
}

function formatAmount(value, maximumFractionDigits = 3) {
  return Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits })
}

function formatDateTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function statusLabel(value) {
  return ({ consumed: 'Đã ăn hết', leftover: 'Còn thức ăn', not_checked: 'Chưa kiểm tra' })[value] || '—'
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
  const result = await api(farmUrl('/ponds-tanks?status=active'))
  tanks.value = result.data
}

function buildQuery() {
  const params = new URLSearchParams({ page: String(page.value), limit: String(pageSize) })
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
    const result = await api(farmUrl(`/feeding-logs?${buildQuery()}`))
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

function applyFilters() {
  page.value = 1
  loadLogs()
}

function openCreate() {
  form.value = { ...emptyForm(), tankId: filters.value.tankId || tanks.value[0]?.id || '' }
  formDialog.value = true
}

async function saveLog() {
  const validation = await formRef.value?.validate()
  if (!validation?.valid) return showToast('Vui lòng kiểm tra các trường chưa hợp lệ.', 'error')
  if (form.value.notes.length > 4000) return showToast('Ghi chú tối đa 4.000 ký tự.', 'error')
  const rate = form.value.feedingRatePercent
  if (rate !== '' && (Number(rate) < 0 || Number(rate) > 100)) return showToast('Tỷ lệ cho ăn phải từ 0 đến 100%.', 'error')

  saving.value = true
  try {
    const payload = {
      ...form.value,
      amount: Number(form.value.amount),
      biomassSnapshotKg: form.value.biomassSnapshotKg === '' ? null : Number(form.value.biomassSnapshotKg),
      feedingRatePercent: rate === '' ? null : Number(rate),
      recommendedAmount: form.value.recommendedAmount === '' ? null : Number(form.value.recommendedAmount),
      feedingTime: new Date(form.value.feedingTime).toISOString(),
      notes: form.value.notes.trim() || null,
    }
    await api(farmUrl('/feeding-logs'), { method: 'POST', body: JSON.stringify(payload) })
    formDialog.value = false
    showToast('Đã ghi nhật ký cho ăn.', 'success')
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

onMounted(loadPage)
</script>

<template>
  <AppShell>
    <section class="feeding-page">
      <header class="page-heading">
        <div>
          <p class="eyebrow">CHĂM SÓC · UC05.4</p>
          <h1>Nhật ký cho ăn</h1>
          <p class="subtitle">Ghi nhận lượng thức ăn thực tế theo ao/bể và theo dõi lịch sử.</p>
        </div>
        <v-btn color="primary" prepend-icon="mdi-plus" :disabled="!canRecord || !tanks.length" @click="openCreate">Ghi lần cho ăn</v-btn>
      </header>

      <div class="filter-row">
        <v-select v-model="filters.tankId" :items="tanks" item-title="name" item-value="id" label="Ao/bể" clearable density="comfortable" variant="outlined" hide-details />
        <v-text-field v-model="filters.from" type="date" label="Từ ngày" density="comfortable" variant="outlined" hide-details />
        <v-text-field v-model="filters.to" type="date" label="Đến ngày" density="comfortable" variant="outlined" hide-details />
        <v-btn variant="tonal" prepend-icon="mdi-magnify" :loading="listLoading" @click="applyFilters">Lọc</v-btn>
      </div>

      <div v-if="summary.amountsByUnit.length" class="summary-row">
        <div v-for="item in summary.amountsByUnit" :key="item.unit" class="summary-item">
          <span>Tổng đã dùng ({{ item.unit }})</span>
          <strong>{{ formatAmount(item.actualAmount) }}</strong>
          <small>Khuyến nghị: {{ formatAmount(item.recommendedAmount) }} {{ item.unit }}</small>
        </div>
        <div v-if="summary.averageFeedingRatePercent" class="summary-item">
          <span>Tỷ lệ cho ăn trung bình</span>
          <strong>{{ formatAmount(summary.averageFeedingRatePercent, 2) }}%</strong>
          <small>Trên các bản ghi có số liệu</small>
        </div>
      </div>

      <div v-if="loading" class="state-message">Đang tải dữ liệu...</div>
      <div v-else-if="error" class="state-message error-state">{{ error }}</div>
      <div v-else-if="!farmId" class="state-message">Chọn trang trại để xem nhật ký.</div>
      <div v-else-if="!tanks.length" class="state-message">Chưa có ao/bể đang hoạt động trong phạm vi được cấp quyền.</div>
      <div v-else class="log-table-wrap">
        <v-table class="log-table" density="comfortable">
          <thead><tr><th>Thời gian</th><th>Ao/bể</th><th>Thức ăn</th><th>Lượng thực tế</th><th>Khuyến nghị</th><th>Sàng ăn</th><th>Người ghi</th></tr></thead>
          <tbody>
            <tr v-for="item in logs" :key="item.id">
              <td>{{ formatDateTime(item.feedingTime) }}</td>
              <td>{{ item.tank.code }} · {{ item.tank.name }}</td>
              <td><strong>{{ item.feedName }}</strong><small v-if="item.notes" class="cell-note">{{ item.notes }}</small></td>
              <td>{{ formatAmount(item.amount) }} {{ item.unit }}</td>
              <td>{{ item.recommendedAmount == null ? '—' : `${formatAmount(item.recommendedAmount)} ${item.unit}` }}</td>
              <td><span class="status-label">{{ statusLabel(item.feedCheckStatus) }}</span></td>
              <td>{{ item.performer.displayName || item.performer.email }}</td>
            </tr>
            <tr v-if="!listLoading && !logs.length"><td colspan="7" class="empty-row">Không có nhật ký trong khoảng lọc này.</td></tr>
          </tbody>
        </v-table>
        <div class="table-footer">
          <span>{{ pagination.total }} bản ghi</span>
          <div class="pager"><v-btn icon="mdi-chevron-left" variant="text" aria-label="Trang trước" :disabled="page <= 1 || listLoading" @click="page--; loadLogs()" /><span>{{ page }} / {{ pageCount }}</span><v-btn icon="mdi-chevron-right" variant="text" aria-label="Trang sau" :disabled="page >= pageCount || listLoading" @click="page++; loadLogs()" /></div>
        </div>
      </div>

      <v-dialog v-model="formDialog" max-width="720">
        <v-card class="form-card">
          <v-card-title>Ghi nhận lần cho ăn</v-card-title>
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="saveLog">
              <div class="form-grid">
                <v-select v-model="form.tankId" :items="tanks" item-title="name" item-value="id" label="Ao/bể *" :rules="[requiredRule('Ao/bể')]" />
                <v-text-field v-model="form.feedingTime" type="datetime-local" label="Thời gian *" :rules="[requiredRule('Thời gian')]" />
                <v-text-field v-model="form.feedName" label="Tên thức ăn *" :rules="feedNameRules" />
                <div class="amount-unit"><v-text-field v-model="form.amount" type="number" min="0.001" step="0.001" label="Lượng thực tế *" :rules="amountRules" /><v-text-field v-model="form.unit" label="Đơn vị *" :rules="unitRules" /></div>
                <v-text-field v-model="form.biomassSnapshotKg" type="number" min="0.001" step="0.001" label="Sinh khối tại thời điểm ghi (kg)" :rules="[optionalPositiveRule('Sinh khối')]" />
                <v-text-field v-model="form.feedingRatePercent" type="number" min="0" max="100" step="0.001" label="Tỷ lệ cho ăn (%)" />
                <v-text-field v-model="form.recommendedAmount" type="number" min="0" step="0.001" label="Lượng khuyến nghị" :rules="[optionalNonNegativeRule('Lượng khuyến nghị')]" />
                <v-select v-model="form.feedCheckStatus" label="Kiểm tra sàng ăn" :items="[{ title: 'Chưa kiểm tra', value: 'not_checked' }, { title: 'Đã ăn hết', value: 'consumed' }, { title: 'Còn thức ăn', value: 'leftover' }]" clearable />
                <v-textarea v-model="form.notes" label="Ghi chú" rows="2" maxlength="4000" counter="4000" class="full-width" />
              </div>
            </v-form>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="saving" @click="formDialog = false">Hủy</v-btn><v-btn color="primary" :loading="saving" @click="saveLog">Lưu nhật ký</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    </section>
  </AppShell>
</template>

<style scoped>
.feeding-page { color: #173f3a; }
.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:26px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; }
h1 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { margin:8px 0 0; color:#71827e; font-size:13px; }
.filter-row { display:grid; grid-template-columns:minmax(190px,1.4fr) minmax(150px,1fr) minmax(150px,1fr) auto; align-items:center; gap:12px; margin-bottom:16px; }
.summary-row { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:18px; }
.summary-item { min-width:190px; padding:13px 16px; border:1px solid #d7e8e3; border-radius:8px; background:#fff; }
.summary-item span,.summary-item small { display:block; color:#71827e; font-size:11px; }
.summary-item strong { display:block; margin:3px 0; font-size:19px; }
.state-message { padding:34px 20px; border:1px solid #dbe9e5; border-radius:8px; color:#71827e; background:#fff; text-align:center; }
.error-state { color:#a33b3b; }
.log-table-wrap { overflow:hidden; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }
.log-table :deep(th) { color:#71827e; font-size:10px; font-weight:800; text-transform:uppercase; white-space:nowrap; }
.log-table :deep(td) { color:#34514c; font-size:12px; }
.cell-note { display:block; max-width:230px; overflow:hidden; color:#83918e; text-overflow:ellipsis; white-space:nowrap; }
.status-label { display:inline-block; padding:5px 8px; border-radius:6px; color:#087f6e; background:#e8f5f1; font-size:10px; font-weight:700; white-space:nowrap; }
.empty-row { height:100px; color:#83918e !important; text-align:center; }
.table-footer { display:flex; align-items:center; justify-content:space-between; min-height:52px; padding:0 14px; border-top:1px solid #e5eeeb; color:#71827e; font-size:11px; }
.pager { display:flex; align-items:center; gap:8px; }
.form-card { border-radius:8px !important; }
.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }
.form-card :deep(.v-card-text) { padding:12px 22px; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 14px; }
.amount-unit { display:grid; grid-template-columns:1fr 100px; gap:10px; }
.full-width { grid-column:1/-1; }
@media(max-width:760px) { .page-heading { align-items:flex-start; flex-direction:column; } .filter-row { grid-template-columns:1fr 1fr; } .filter-row .v-btn { grid-column:1/-1; } .form-grid { grid-template-columns:1fr; } .full-width { grid-column:auto; } .log-table-wrap { overflow-x:auto; } }
</style>
