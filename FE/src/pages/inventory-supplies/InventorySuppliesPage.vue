<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const farms = ref([])
const supplies = ref([])
const loading = ref(true)
const listLoading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const error = ref('')
const query = ref('')
const categoryFilter = ref('')
const lowStockOnly = ref(false)
const page = ref(1)
const pageSize = 50
const pagination = ref({ total: 0, pageCount: 1 })
const dialog = ref(false)
const formRef = ref(null)
const editingSupply = ref(null)
const deletingSupply = ref(null)
const form = ref(emptyForm())
const importDialog = ref(false)
const importFormRef = ref(null)
const importing = ref(false)
const importTarget = ref(null)
const importForm = ref(emptyImportForm())
const importHistoryDialog = ref(false)
const importHistoryLoading = ref(false)
const importHistory = ref([])
const adjustmentDialog = ref(false)
const adjustmentFormRef = ref(null)
const adjusting = ref(false)
const adjustmentTarget = ref(null)
const adjustmentForm = ref(emptyAdjustmentForm())
const adjustmentHistoryDialog = ref(false)
const adjustmentHistoryLoading = ref(false)
const adjustmentHistory = ref([])

const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const role = computed(() => selectedFarm.value?.role || '')
const canManage = computed(() => ['owner', 'warehouse_staff'].includes(role.value))
const canRequestSupply = computed(() => ['owner', 'area_manager', 'warehouse_staff'].includes(role.value))
const pageCount = computed(() => Math.max(1, pagination.value.pageCount || 1))
const categoryOptions = [
  { title: 'Thức ăn', value: 'feed' },
  { title: 'Thuốc', value: 'medicine' },
  { title: 'Hóa chất', value: 'chemical' },
  { title: 'Chế phẩm sinh học', value: 'probiotic' },
  { title: 'Khác', value: 'other' },
]
const categoryNames = Object.fromEntries(categoryOptions.map(({ title, value }) => [value, title]))
const requiredRule = (label) => (value) => String(value ?? '').trim().length > 0 || `${label} là bắt buộc.`
const nameRules = [requiredRule('Tên vật tư'), (v) => String(v || '').trim().length <= 150 || 'Tên vật tư tối đa 150 ký tự.']
const unitRules = [requiredRule('Đơn vị tính'), (v) => String(v || '').trim().length <= 20 || 'Đơn vị tính tối đa 20 ký tự.']
const categoryRules = [requiredRule('Loại vật tư'), (v) => categoryOptions.some((item) => item.value === v) || 'Loại vật tư không hợp lệ.']
const nonNegativeRule = (label, max, decimals) => (value) => {
  if (value === '' || value === null || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > max) return `${label} phải từ 0 đến ${max}.`
  const factor = 10 ** decimals
  return Math.abs(Number(value) * factor - Math.round(Number(value) * factor)) <= 1e-7 || `${label} có tối đa ${decimals} chữ số thập phân.`
}
const priceRules = [requiredRule('Đơn giá'), nonNegativeRule('Đơn giá', 9_999_999_999.99, 2)]
const thresholdRules = [requiredRule('Ngưỡng cảnh báo'), nonNegativeRule('Ngưỡng cảnh báo', 999_999_999.999, 3)]
const descriptionRules = [(v) => String(v ?? '').length <= 4000 || 'Mô tả tối đa 4.000 ký tự.']

const importQuantityRule = (value) => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 999_999_999.999 && Math.abs(Number(value) * 1000 - Math.round(Number(value) * 1000)) < 1e-7 || 'Số lượng phải lớn hơn 0 và có tối đa 3 chữ số thập phân.'
const importPriceRule = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 9_999_999_999.99 && Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) < 1e-7 || 'Đơn giá phải không âm và có tối đa 2 chữ số thập phân.'
const importDateRule = (value) => Boolean(value) && !Number.isNaN(new Date(value).getTime()) || 'Thời gian nhập không hợp lệ.'
const adjustmentQuantityRule = (value) => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 999_999_999.999 && Math.abs(Number(value) * 1000 - Math.round(Number(value) * 1000)) < 1e-7 || 'Số lượng phải lớn hơn 0, tối đa 3 chữ số thập phân.'
const adjustmentDateRule = (value) => Boolean(value) && !Number.isNaN(new Date(value).getTime()) || 'Thời điểm điều chỉnh không hợp lệ.'

function emptyForm() {
  return { name: '', category: 'feed', unit: 'kg', unitPrice: '0', minThreshold: '0', description: '' }
}

function emptyImportForm() {
  const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  return { quantity: '', unitPrice: '', transactionDate: localNow, notes: '' }
}

function emptyAdjustmentForm() {
  const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  return { direction: 'increase', quantity: '', transactionDate: localNow, reason: '' }
}

function farmUrl(path = '') { return `/farms/${encodeURIComponent(farmId.value)}${path}` }
function formatNumber(value, digits = 3) { return Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: digits }) }

async function loadFarms() {
  farms.value = (await api('/farms')).data
  farmContext.farms = farms.value
  farmContext.ready = true
  if (!farms.value.some((farm) => farm.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
}

async function loadSupplies() {
  if (!farmId.value) { supplies.value = []; return }
  listLoading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(pageSize) })
    if (query.value.trim()) params.set('q', query.value.trim())
    if (categoryFilter.value) params.set('category', categoryFilter.value)
    if (lowStockOnly.value) params.set('lowStock', 'true')
    const result = await api(farmUrl(`/inventory-supplies?${params}`))
    supplies.value = result.data.items
    pagination.value = result.data.pagination
  } catch (err) {
    supplies.value = []
    error.value = err.message
    showToast(err.message, 'error')
  } finally { listLoading.value = false }
}

async function loadPage() {
  loading.value = true
  error.value = ''
  try { await loadFarms(); await loadSupplies() }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
  finally { loading.value = false }
}

function applyFilters() { page.value = 1; loadSupplies() }

function openCreate() {
  editingSupply.value = null
  form.value = emptyForm()
  dialog.value = true
}

function openEdit(supply) {
  editingSupply.value = supply
  form.value = {
    name: supply.name,
    category: supply.category,
    unit: supply.unit,
    unitPrice: supply.unitPrice,
    minThreshold: supply.minThreshold,
    description: supply.description || '',
  }
  dialog.value = true
}

function openImport(supply) {
  importTarget.value = supply
  importForm.value = { ...emptyImportForm(), unitPrice: supply.unitPrice }
  importDialog.value = true
}

async function submitImport() {
  const validation = await importFormRef.value?.validate()
  if (!validation?.valid) return showToast('Vui lòng kiểm tra lại thông tin nhập kho.', 'error')
  if (importForm.value.notes.length > 4000) return showToast('Ghi chú không được vượt quá 4.000 ký tự.', 'error')
  importing.value = true
  try {
    await api(farmUrl('/inventory-transactions/imports'), {
      method: 'POST',
      body: JSON.stringify({
        supplyId: importTarget.value.id,
        quantity: Number(importForm.value.quantity),
        unitPrice: Number(importForm.value.unitPrice),
        transactionDate: new Date(importForm.value.transactionDate).toISOString(),
        notes: importForm.value.notes.trim() || null,
      }),
    })
    importDialog.value = false
    showToast('Nhập kho thành công, tồn kho đã được cập nhật.', 'success')
    await loadSupplies()
  } catch (err) { showToast(err.message, 'error') }
  finally { importing.value = false }
}

async function openImportHistory(supply) {
  importTarget.value = supply
  importHistory.value = []
  importHistoryDialog.value = true
  importHistoryLoading.value = true
  try {
    const result = await api(farmUrl(`/inventory-transactions/imports?supplyId=${encodeURIComponent(supply.id)}&page=1&limit=100`))
    importHistory.value = result.data.items
  } catch (err) {
    importHistoryDialog.value = false
    showToast(err.message, 'error')
  } finally { importHistoryLoading.value = false }
}

function openAdjustment(supply) {
  adjustmentTarget.value = supply
  adjustmentForm.value = emptyAdjustmentForm()
  adjustmentDialog.value = true
}

async function submitAdjustment() {
  const validation = await adjustmentFormRef.value?.validate()
  if (!validation?.valid) return
  const reason = adjustmentForm.value.reason.trim()
  if (!reason || reason.length > 4000) return showToast('Lý do điều chỉnh là bắt buộc, tối đa 4.000 ký tự.', 'error')
  adjusting.value = true
  try {
    await api(farmUrl('/inventory-transactions/adjustments'), {
      method: 'POST',
      body: JSON.stringify({ supplyId: adjustmentTarget.value.id, direction: adjustmentForm.value.direction, quantity: Number(adjustmentForm.value.quantity), transactionDate: new Date(adjustmentForm.value.transactionDate).toISOString(), reason }),
    })
    adjustmentDialog.value = false
    showToast('Đã điều chỉnh tồn kho và ghi lịch sử.', 'success')
    await loadSupplies()
  } catch (err) { showToast(err.message, 'error') }
  finally { adjusting.value = false }
}

async function openAdjustmentHistory(supply) {
  adjustmentTarget.value = supply
  adjustmentHistory.value = []
  adjustmentHistoryDialog.value = true
  adjustmentHistoryLoading.value = true
  try {
    const result = await api(farmUrl(`/inventory-transactions/adjustments?supplyId=${encodeURIComponent(supply.id)}&page=1&limit=100`))
    adjustmentHistory.value = result.data.items
  } catch (err) {
    adjustmentHistoryDialog.value = false
    showToast(err.message, 'error')
  } finally { adjustmentHistoryLoading.value = false }
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

async function saveSupply() {
  const validation = await formRef.value?.validate()
  if (!validation?.valid) return showToast('Vui lòng kiểm tra các trường chưa hợp lệ.', 'error')
  saving.value = true
  try {
    const payload = {
      ...form.value,
      name: form.value.name.trim(),
      unit: form.value.unit.trim(),
      unitPrice: Number(form.value.unitPrice),
      minThreshold: Number(form.value.minThreshold),
      description: form.value.description.trim() || null,
    }
    const isEditing = Boolean(editingSupply.value)
    const path = isEditing ? farmUrl(`/inventory-supplies/${encodeURIComponent(editingSupply.value.id)}`) : farmUrl('/inventory-supplies')
    await api(path, { method: isEditing ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
    dialog.value = false
    showToast(isEditing ? 'Đã cập nhật vật tư.' : 'Đã thêm vật tư; tồn ban đầu bằng 0.', 'success')
    await loadSupplies()
  } catch (err) { showToast(err.message, 'error') }
  finally { saving.value = false }
}

async function deleteSupply() {
  if (!deletingSupply.value) return
  deleting.value = true
  try {
    await api(farmUrl(`/inventory-supplies/${encodeURIComponent(deletingSupply.value.id)}`), { method: 'DELETE' })
    showToast('Đã xóa vật tư.', 'success')
    deletingSupply.value = null
    await loadSupplies()
  } catch (err) { showToast(err.message, 'error') }
  finally { deleting.value = false }
}

watch(farmId, () => { page.value = 1; loadSupplies() })
onMounted(loadPage)
</script>

<template>
  <AppShell>
    <section class="supplies-page">
      <header class="page-heading">
        <div>
          <p class="eyebrow">KHO · UC07.1</p>
          <h1>Danh mục vật tư</h1>
          <p class="subtitle">Quản lý mặt hàng, đơn vị, đơn giá và ngưỡng cảnh báo tồn kho.</p>
        </div>
        <div class="heading-actions">
          <v-btn v-if="canRequestSupply && farmId" to="/inventory-requests" variant="outlined" prepend-icon="mdi-clipboard-list-outline">Yêu cầu cấp</v-btn>
          <v-btn v-if="canManage && farmId" color="primary" prepend-icon="mdi-plus" @click="openCreate">Thêm vật tư</v-btn>
        </div>
      </header>

      <div class="filter-row">
        <v-text-field v-model="query" label="Tìm tên vật tư" prepend-inner-icon="mdi-magnify" clearable density="comfortable" hide-details @keyup.enter="applyFilters" />
        <v-select v-model="categoryFilter" :items="categoryOptions" label="Nhóm vật tư" clearable density="comfortable" hide-details />
        <v-checkbox v-model="lowStockOnly" label="Dưới ngưỡng" color="primary" hide-details density="comfortable" />
        <v-btn variant="tonal" :loading="listLoading" @click="applyFilters">Lọc</v-btn>
      </div>

      <div v-if="loading" class="state-message">Đang tải danh mục...</div>
      <div v-else-if="error" class="state-message error-state">{{ error }}</div>
      <div v-else-if="!farmId" class="state-message">Chọn trang trại để xem vật tư.</div>
      <div v-else class="table-wrap">
        <v-table class="supplies-table" density="comfortable">
          <thead><tr><th>Vật tư</th><th>Nhóm</th><th>Đơn vị</th><th>Tồn hiện tại</th><th>Đơn giá</th><th>Ngưỡng cảnh báo</th><th v-if="canManage" class="action-col">Thao tác</th></tr></thead>
          <tbody>
            <tr v-for="item in supplies" :key="item.id">
              <td><strong>{{ item.name }}</strong><small v-if="item.description" class="description">{{ item.description }}</small></td>
              <td>{{ categoryNames[item.category] || item.category }}</td>
              <td>{{ item.unit }}</td>
              <td><span :class="['quantity', { low: item.isBelowThreshold }]">{{ formatNumber(item.quantity) }} {{ item.unit }}</span><small v-if="item.isBelowThreshold" class="low-note">Dưới ngưỡng</small></td>
              <td>{{ formatNumber(item.unitPrice, 2) }}</td>
              <td>{{ formatNumber(item.minThreshold) }} {{ item.unit }}</td>
              <td v-if="canManage" class="action-col">
                <v-btn icon="mdi-tray-arrow-down" variant="text" size="small" :aria-label="`Nhập kho ${item.name}`" title="Nhập kho" @click="openImport(item)" />
                <v-btn icon="mdi-history" variant="text" size="small" :aria-label="`Lịch sử nhập kho ${item.name}`" title="Lịch sử nhập kho" @click="openImportHistory(item)" />
                <v-btn icon="mdi-swap-vertical" variant="text" size="small" :aria-label="`Điều chỉnh tồn ${item.name}`" title="Điều chỉnh tồn kho" @click="openAdjustment(item)" />
                <v-btn icon="mdi-history" variant="text" size="small" :aria-label="`Lịch sử điều chỉnh ${item.name}`" title="Lịch sử điều chỉnh" @click="openAdjustmentHistory(item)" />
                <v-btn icon="mdi-pencil-outline" variant="text" size="small" :aria-label="`Sửa ${item.name}`" title="Cập nhật vật tư" @click="openEdit(item)" />
                <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" :aria-label="`Xóa ${item.name}`" title="Xóa vật tư" @click="deletingSupply = item" />
              </td>
            </tr>
            <tr v-if="!listLoading && !supplies.length"><td :colspan="canManage ? 7 : 6" class="empty-row">{{ lowStockOnly ? 'Không có vật tư nào dưới ngưỡng.' : 'Chưa có vật tư phù hợp.' }}</td></tr>
          </tbody>
        </v-table>
        <div class="table-footer">
          <span>{{ pagination.total }} vật tư</span>
          <div class="pager"><v-btn icon="mdi-chevron-left" variant="text" aria-label="Trang trước" :disabled="page <= 1 || listLoading" @click="page--; loadSupplies()" /><span>{{ page }} / {{ pageCount }}</span><v-btn icon="mdi-chevron-right" variant="text" aria-label="Trang sau" :disabled="page >= pageCount || listLoading" @click="page++; loadSupplies()" /></div>
        </div>
      </div>

      <v-dialog v-model="dialog" max-width="650">
        <v-card class="form-card">
          <v-card-title>{{ editingSupply ? 'Cập nhật vật tư' : 'Thêm vật tư' }}</v-card-title>
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="saveSupply">
              <div class="form-grid">
                <v-text-field v-model="form.name" label="Tên vật tư *" :rules="nameRules" />
                <v-select v-model="form.category" :items="categoryOptions" label="Nhóm vật tư *" :rules="categoryRules" />
                <v-text-field v-model="form.unit" label="Đơn vị tính *" placeholder="kg, lít, bao..." :rules="unitRules" />
                <v-text-field v-model="form.unitPrice" type="number" min="0" step="0.01" label="Đơn giá *" :rules="priceRules" />
                <v-text-field v-model="form.minThreshold" type="number" min="0" step="0.001" label="Ngưỡng cảnh báo *" :rules="thresholdRules" />
                <v-text-field v-if="!editingSupply" model-value="0" label="Tồn ban đầu" readonly hint="Tồn kho chỉ thay đổi qua giao dịch nhập/xuất/điều chỉnh." persistent-hint />
                <v-textarea v-model="form.description" label="Mô tả" rows="2" maxlength="4000" counter="4000" class="full-width" :rules="descriptionRules" />
              </div>
            </v-form>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="saving" @click="dialog = false">Hủy</v-btn><v-btn color="primary" :loading="saving" @click="saveSupply">Lưu</v-btn></v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="importDialog" max-width="580">
        <v-card class="form-card">
          <v-card-title>Nhập kho{{ importTarget ? ` · ${importTarget.name}` : '' }}</v-card-title>
          <v-card-text>
            <v-form ref="importFormRef" @submit.prevent="submitImport">
              <div class="form-grid">
                <v-text-field :model-value="importTarget?.unit" label="Đơn vị" readonly />
                <v-text-field v-model="importForm.quantity" type="number" min="0.001" max="999999999.999" step="0.001" label="Số lượng nhập *" :rules="[requiredRule('Số lượng nhập'), importQuantityRule]" />
                <v-text-field v-model="importForm.unitPrice" type="number" min="0" max="9999999999.99" step="0.01" label="Đơn giá nhập *" :rules="[requiredRule('Đơn giá nhập'), importPriceRule]" />
                <v-text-field v-model="importForm.transactionDate" type="datetime-local" label="Thời gian nhập *" :rules="[importDateRule]" />
                <v-textarea v-model="importForm.notes" label="Ghi chú / mã hóa đơn" rows="2" maxlength="4000" counter="4000" class="full-width" />
              </div>
            </v-form>
            <p class="import-note">Lịch sử nhập kho được lưu; tồn hiện tại và đơn giá vật tư được cập nhật cùng giao dịch.</p>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="importing" @click="importDialog = false">Hủy</v-btn><v-btn color="primary" :loading="importing" @click="submitImport">Xác nhận nhập</v-btn></v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="importHistoryDialog" max-width="760">
        <v-card class="form-card">
          <v-card-title>Lịch sử nhập kho{{ importTarget ? ` · ${importTarget.name}` : '' }}</v-card-title>
          <v-card-text>
            <div v-if="importHistoryLoading" class="state-message">Đang tải lịch sử...</div>
            <div v-else-if="!importHistory.length" class="state-message">Chưa có giao dịch nhập kho.</div>
            <div v-else class="history-table-wrap"><v-table density="comfortable">
              <thead><tr><th>Thời gian</th><th>Số lượng</th><th>Đơn giá</th><th>Người nhập</th><th>Ghi chú</th></tr></thead>
              <tbody><tr v-for="item in importHistory" :key="item.id"><td>{{ formatDateTime(item.transactionDate) }}</td><td>{{ formatNumber(item.quantity) }} {{ item.supply.unit }}</td><td>{{ formatNumber(item.unitPrice, 2) }}</td><td>{{ item.creator.displayName || item.creator.email }}</td><td>{{ item.notes || '—' }}</td></tr></tbody>
            </v-table></div>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" @click="importHistoryDialog = false">Đóng</v-btn></v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="adjustmentDialog" max-width="580">
        <v-card class="form-card">
          <v-card-title>Điều chỉnh tồn kho{{ adjustmentTarget ? ` · ${adjustmentTarget.name}` : '' }}</v-card-title>
          <v-card-text>
            <p class="adjustment-stock">Tồn hiện tại: <strong>{{ formatNumber(adjustmentTarget?.quantity) }} {{ adjustmentTarget?.unit }}</strong></p>
            <v-form ref="adjustmentFormRef" @submit.prevent="submitAdjustment">
              <div class="form-grid">
                <v-select v-model="adjustmentForm.direction" :items="[{ title: 'Tăng tồn', value: 'increase' }, { title: 'Giảm tồn', value: 'decrease' }]" label="Chiều điều chỉnh *" />
                <v-text-field :model-value="adjustmentTarget?.unit" label="Đơn vị" readonly />
                <v-text-field v-model="adjustmentForm.quantity" type="number" min="0.001" max="999999999.999" step="0.001" label="Số lượng điều chỉnh *" :rules="[requiredRule('Số lượng'), adjustmentQuantityRule]" />
                <v-text-field v-model="adjustmentForm.transactionDate" type="datetime-local" label="Thời điểm *" :rules="[adjustmentDateRule]" />
                <v-textarea v-model="adjustmentForm.reason" label="Lý do điều chỉnh *" rows="2" maxlength="4000" counter="4000" class="full-width" :rules="[requiredRule('Lý do')]" />
              </div>
            </v-form>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="adjusting" @click="adjustmentDialog = false">Hủy</v-btn><v-btn color="primary" :loading="adjusting" @click="submitAdjustment">Lưu điều chỉnh</v-btn></v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="adjustmentHistoryDialog" max-width="760">
        <v-card class="form-card">
          <v-card-title>Lịch sử điều chỉnh{{ adjustmentTarget ? ` · ${adjustmentTarget.name}` : '' }}</v-card-title>
          <v-card-text>
            <div v-if="adjustmentHistoryLoading" class="state-message">Đang tải lịch sử...</div>
            <div v-else-if="!adjustmentHistory.length" class="state-message">Chưa có giao dịch điều chỉnh.</div>
            <div v-else class="history-table-wrap"><v-table density="comfortable">
              <thead><tr><th>Thời gian</th><th>Biến động</th><th>Tồn thay đổi</th><th>Người ghi</th><th>Lý do</th></tr></thead>
              <tbody><tr v-for="item in adjustmentHistory" :key="item.id"><td>{{ formatDateTime(item.transactionDate) }}</td><td>{{ Number(item.quantity) > 0 ? 'Tăng' : 'Giảm' }}</td><td>{{ formatNumber(Math.abs(Number(item.quantity))) }} {{ item.supply.unit }}</td><td>{{ item.creator.displayName || item.creator.email }}</td><td>{{ item.notes }}</td></tr></tbody>
            </v-table></div>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" @click="adjustmentHistoryDialog = false">Đóng</v-btn></v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog :model-value="Boolean(deletingSupply)" max-width="460" @update:model-value="(value) => { if (!value && !deleting.value) deletingSupply = null }">
        <v-card class="form-card">
          <v-card-title>Xóa vật tư</v-card-title>
          <v-card-text>
            <p v-if="deletingSupply">Bạn có chắc muốn xóa <strong>{{ deletingSupply.name }}</strong>?</p>
            <p class="delete-note">Chỉ vật tư chưa có tồn kho và chưa phát sinh giao dịch mới được xóa. Mặt hàng thức ăn đang được dùng trong nhật ký cho ăn có thể tiếp tục được lưu theo tên đã ghi nhận.</p>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="deleting" @click="deletingSupply = null">Hủy</v-btn><v-btn color="error" :loading="deleting" @click="deleteSupply">Xóa</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    </section>
  </AppShell>
</template>

<style scoped>
.supplies-page { color:#173f3a; }
.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:24px; }.heading-actions { display:flex; flex-wrap:wrap; gap:8px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; }
h1 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { margin:8px 0 0; color:#71827e; font-size:13px; }
.filter-row { display:grid; grid-template-columns:minmax(200px,1fr) minmax(170px,.75fr) auto auto; align-items:center; gap:12px; margin-bottom:17px; }
.state-message { padding:34px 20px; border:1px solid #dbe9e5; border-radius:8px; color:#71827e; background:#fff; text-align:center; }
.error-state { color:#a33b3b; }
.table-wrap { overflow:hidden; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }
.supplies-table :deep(th) { color:#71827e; font-size:10px; font-weight:800; text-transform:uppercase; white-space:nowrap; }
.supplies-table :deep(td) { color:#34514c; font-size:12px; }
.description,.low-note { display:block; margin-top:3px; max-width:260px; overflow:hidden; color:#83918e; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
.quantity { font-weight:700; }.quantity.low,.low-note { color:#b34a32; }
.action-col { min-width:230px; text-align:right !important; white-space:nowrap; }
.empty-row { height:100px; color:#83918e !important; text-align:center; }
.table-footer { display:flex; align-items:center; justify-content:space-between; min-height:52px; padding:0 14px; border-top:1px solid #e5eeeb; color:#71827e; font-size:11px; }
.pager { display:flex; align-items:center; gap:8px; }
.form-card { border-radius:8px !important; }.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }.form-card :deep(.v-card-text) { padding:12px 22px; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 14px; }.full-width { grid-column:1/-1; }
.delete-note { margin-top:10px; color:#71827e; font-size:13px; }
.import-note { margin:8px 0 0; color:#71827e; font-size:12px; line-height:1.5; }.history-table-wrap { overflow:auto; border:1px solid #dbe9e5; border-radius:6px; }.history-table-wrap :deep(th) { color:#71827e; font-size:10px; text-transform:uppercase; white-space:nowrap; }.history-table-wrap :deep(td) { color:#34514c; font-size:12px; }
.adjustment-stock { margin:0 0 12px; color:#71827e; font-size:13px; }.adjustment-stock strong { color:#173f3a; }
@media(max-width:760px) { .page-heading { align-items:flex-start; flex-direction:column; }.filter-row { grid-template-columns:1fr 1fr; }.filter-row .v-btn { grid-column:1/-1; }.table-wrap { overflow-x:auto; }.form-grid { grid-template-columns:1fr; }.full-width { grid-column:auto; } }
</style>
