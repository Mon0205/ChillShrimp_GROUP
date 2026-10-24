<script setup>
import Pagination from '../../components/pagination/index.vue'
import LoadingIndicator from '../../components/loading/index.vue'
import AppShell from '../../components/shell/index.vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const farms = ref([])
const supplies = ref([])
const areas = ref([])
const tanks = ref([])
const requests = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(true)
const submitting = ref(false)
const formRef = ref(null)
const form = ref({ supplyId: '', areaId: '', tankId: '', quantity: '', notes: '' })
const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find(farm => farm.id === farmId.value))
const role = computed(() => selectedFarm.value?.role || '')
const selectedAreaId = computed(() => role.value === 'area_manager' ? selectedFarm.value?.area?.id || '' : form.value.areaId)
const tankOptions = computed(() => tanks.value.filter(tank => tank.areaId === selectedAreaId.value && !tank.deletedAt && tank.status !== 'inactive'))
const processing = ref(false)
const detailDialog = ref(false)
const selectedRequest = ref(null)
const decision = ref('')
const rejectionReason = ref('')
const processingError = ref('')
const decisionFormRef = ref(null)
const statusColors = { pending: 'warning', fulfilled: 'success', rejected: 'error', cancelled: 'default' }
const canApprove = computed(() => ['owner', 'farm_manager', 'warehouse_staff'].includes(role.value))
const statusLabels = { pending: 'Chờ xử lý', fulfilled: 'Đã cấp', rejected: 'Đã từ chối', cancelled: 'Đã hủy' }
const canCreate = computed(() => role.value === 'area_manager')
const hasStockRoles = computed(() => ['owner', 'farm_manager', 'area_manager', 'warehouse_staff'].includes(role.value))
const positiveQuantity = (value) => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 999_999_999.999 && Math.abs(Number(value) * 1000 - Math.round(Number(value) * 1000)) < 1e-7 || 'Số lượng phải lớn hơn 0, tối đa 3 chữ số thập phân.'
const required = (value) => Boolean(value) || 'Trường này là bắt buộc.'

function farmUrl(path) { return `/farms/${encodeURIComponent(farmId.value)}${path}` }
function quantity(value) { return Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 }) }
function dateTime(value) { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }

async function load() {
  loading.value = true
  try {
    farms.value = (await api('/farms')).data
    farmContext.farms = farms.value
    farmContext.ready = true
    if (!farms.value.some((farm) => farm.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
    await loadFarmData()
  } catch (error) { showToast(error.message, 'error') }
  finally { loading.value = false }
}

async function loadFarmData() {
  requests.value = []
  total.value = 0
  supplies.value = []
  areas.value = []
  tanks.value = []
  if (!farmId.value || !hasStockRoles.value) return
  const [requestResult, supplyResult] = await Promise.all([
    api(farmUrl(`/inventory-transactions/requests?page=${page.value}&limit=${pageSize.value}`)),
    canCreate.value ? api(farmUrl('/inventory-supplies?limit=100')) : Promise.resolve({ data: { items: [] } }),
  ])
  requests.value = requestResult.data.items
  total.value = requestResult.data.pagination.total
  const lastPage = Math.max(1, requestResult.data.pagination.pageCount)
  if (page.value > lastPage) { page.value = lastPage; return }
  supplies.value = supplyResult.data.items
  if (canCreate.value) {
    const [areaResult, tankResult] = await Promise.all([api(farmUrl('/areas')), api(farmUrl('/ponds-tanks'))])
    areas.value = areaResult.data.filter(area => area.status === 'active')
    tanks.value = tankResult.data
  }
}

async function submit() {
  const result = await formRef.value?.validate()
  if (!result?.valid) return
  if (!selectedAreaId.value || !tankOptions.value.some(tank => tank.id === form.value.tankId)) return showToast('Chọn ao/bể thuộc khu vực nhận vật tư.', 'error')
  if (form.value.notes.length > 4000) return showToast('Ghi chú tối đa 4.000 ký tự.', 'error')
  submitting.value = true
  try {
    await api(farmUrl('/inventory-transactions/requests'), {
      method: 'POST',
      body: JSON.stringify({ supplyId: form.value.supplyId, areaId: selectedAreaId.value || null, tankId: form.value.tankId, quantity: Number(form.value.quantity), notes: form.value.notes.trim() || null }),
    })
    form.value = { supplyId: '', areaId: '', tankId: '', quantity: '', notes: '' }
    showToast('Đã gửi yêu cầu cấp vật tư.', 'success')
    await loadFarmData()
  } catch (error) { showToast(error.message, 'error') }
  finally { submitting.value = false }
}

async function openDetails(item) {
  selectedRequest.value = item
  decision.value = ''
  rejectionReason.value = ''
  processingError.value = ''
  detailDialog.value = true
  await nextTick()
  decisionFormRef.value?.resetValidation()
}

async function processRequest() {
  if (processing.value || !canApprove.value || selectedRequest.value?.status !== 'pending') return
  const selectedFarmId = farmId.value
  const item = selectedRequest.value
  processing.value = true
  processingError.value = ''
  try {
    const validation = await decisionFormRef.value?.validate()
    if (!validation?.valid || farmId.value !== selectedFarmId || selectedRequest.value?.id !== item.id) return
    const action = decision.value
    if (!['approve', 'reject'].includes(action)) return
    const result = await api(`/farms/${encodeURIComponent(selectedFarmId)}/inventory-transactions/requests/${encodeURIComponent(item.id)}/${action}`, {
      method: 'POST',
      ...(action === 'reject' ? { body: JSON.stringify({ reason: rejectionReason.value.trim() }) } : {}),
    })
    if (farmId.value === selectedFarmId) {
      selectedRequest.value = result.data
      showToast(action === 'approve' ? 'Đã cấp vật tư và ghi lịch sử.' : 'Đã từ chối yêu cầu.', 'success')
      await loadFarmData().catch(error => showToast(error.message, 'error'))
    }
  } catch (error) {
    if (farmId.value === selectedFarmId) processingError.value = error.message
  } finally { processing.value = false }
}

watch(page, () => { loadFarmData().catch(error => showToast(error.message, 'error')) })
watch(pageSize, () => { if (page.value === 1) loadFarmData().catch(error => showToast(error.message, 'error')); else page.value = 1 })
watch(selectedAreaId, () => { form.value.tankId = '' })
watch(farmId, () => { detailDialog.value = false; selectedRequest.value = null; page.value = 1; form.value = { supplyId: '', areaId: '', tankId: '', quantity: '', notes: '' }; loadFarmData().catch((error) => showToast(error.message, 'error')) })
onMounted(load)
</script>

<template>
<AppShell>
    <section class="requests-page">
      <header class="page-heading">
        <div class="section-page-title"><v-avatar color="primary" variant="tonal" rounded="lg" size="44"><v-icon icon="mdi-clipboard-list-outline" size="25" /></v-avatar><h1>{{ canApprove ? 'Danh sách yêu cầu vật tư' : 'Yêu cầu cấp vật tư' }}</h1></div>
      </header>
      <LoadingIndicator v-if="loading" />
      <div v-else-if="!farmId" class="state-message">Chọn trang trại để xem yêu cầu.</div>
      <template v-else>
        <section v-if="canCreate" class="request-form">
          <h2>Tạo yêu cầu</h2>
          <v-form ref="formRef" @submit.prevent="submit">
            <div class="form-grid">
              <v-select v-model="form.supplyId" :items="supplies" item-title="name" item-value="id" label="Vật tư *" :rules="[required]" />
              <v-select v-if="['owner', 'farm_manager'].includes(role)" v-model="form.areaId" :items="areas" item-title="name" item-value="id" label="Khu vực *" :rules="[required]" />
              <v-text-field v-else :model-value="areas.find(area => area.id === selectedAreaId)?.name || ''" label="Khu vực" readonly />
              <v-select v-model="form.tankId" :items="tankOptions" :item-title="tank => [tank?.code, tank?.name].filter(Boolean).join(' · ')" item-value="id" label="Ao/bể nhận vật tư *" :disabled="!selectedAreaId" :rules="[required]" no-data-text="Khu vực chưa có ao/bể phù hợp" />
              <v-text-field v-model="form.quantity" type="number" min="0.001" step="0.001" label="Số lượng *" :rules="[required, positiveQuantity]" />
              <v-textarea v-model="form.notes" label="Ghi chú" rows="1" maxlength="4000" counter="4000" />
              <v-btn color="primary" prepend-icon="mdi-send-outline" :loading="submitting" @click="submit">Gửi yêu cầu</v-btn>
            </div>
          </v-form>
        </section>
        <section class="request-list">
          <h2>Danh sách yêu cầu</h2>
          <div class="table-wrap"><v-table class="app-data-table" density="comfortable">
            <thead><tr><th>Ngày gửi</th><th>Vật tư</th><th>Khu vực</th><th>Ao/bể nhận</th><th>Số lượng</th><th>Người yêu cầu</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
            <tbody>
              <tr v-for="item in requests" :key="item.id" class="request-row" tabindex="0" :aria-label="`Xem yêu cầu ${item.supply.name}`" @click="openDetails(item)" @keydown.enter.self.prevent="openDetails(item)" @keydown.space.self.prevent="openDetails(item)">
                <td>{{ dateTime(item.createdAt) }}</td><td><strong>{{ item.supply.name }}</strong><small>{{ item.supply.category }}</small></td>
                <td>{{ item.area?.name || 'Toàn trại' }}</td><td>{{ item.tank ? `${item.tank.code} · ${item.tank.name}` : 'Chưa chỉ định' }}</td><td>{{ quantity(item.quantity) }} {{ item.supply.unit }}</td>
                <td>{{ item.requester.displayName || item.requester.email }}</td><td><v-chip size="small" :color="statusColors[item.status]" variant="tonal">{{ statusLabels[item.status] || item.status }}</v-chip></td><td>{{ item.notes || '—' }}</td>
              </tr>
              <tr v-if="!requests.length"><td colspan="8" class="empty-row">Chưa có yêu cầu cấp vật tư.</td></tr>
            </tbody>
          </v-table></div>
          <Pagination v-model:page="page" v-model:page-size="pageSize" :total="total" :loading="processing" />
        </section>
      </template>
      <v-dialog v-model="detailDialog" max-width="640" :persistent="processing" scrollable>
        <v-card v-if="selectedRequest" class="request-detail">
          <v-card-title>Chi tiết yêu cầu vật tư</v-card-title>
          <v-card-text>
            <dl class="detail-grid">
              <div><dt>Vật tư</dt><dd>{{ selectedRequest.supply.name }}</dd></div>
              <div><dt>Số lượng</dt><dd>{{ quantity(selectedRequest.quantity) }} {{ selectedRequest.supply.unit }}</dd></div>
              <div><dt>Khu vực</dt><dd>{{ selectedRequest.area?.name || 'Toàn trại' }}</dd></div>
              <div><dt>Ao/bể nhận</dt><dd>{{ selectedRequest.tank ? `${selectedRequest.tank.code} · ${selectedRequest.tank.name}` : 'Chưa chỉ định' }}</dd></div>
              <div><dt>Người yêu cầu</dt><dd>{{ selectedRequest.requester.displayName || selectedRequest.requester.email }}</dd></div>
              <div><dt>Ngày gửi</dt><dd>{{ dateTime(selectedRequest.createdAt) }}</dd></div>
              <div><dt>Trạng thái</dt><dd><v-chip size="small" :color="statusColors[selectedRequest.status]" variant="tonal">{{ statusLabels[selectedRequest.status] || selectedRequest.status }}</v-chip></dd></div>
              <div v-if="selectedRequest.processedAt"><dt>Người xử lý / thời gian</dt><dd>{{ selectedRequest.processor?.displayName || selectedRequest.processor?.email || '—' }} · {{ dateTime(selectedRequest.processedAt) }}</dd></div>
              <div class="detail-wide"><dt>Ghi chú yêu cầu</dt><dd>{{ selectedRequest.notes || '—' }}</dd></div>
              <div v-if="selectedRequest.rejectionReason" class="detail-wide"><dt>Lý do từ chối</dt><dd>{{ selectedRequest.rejectionReason }}</dd></div>
            </dl>
            <v-form v-if="canApprove && selectedRequest.status === 'pending'" ref="decisionFormRef" validate-on="submit" @submit.prevent="processRequest">
              <v-select v-model="decision" :items="[{ title: 'Đồng ý cấp', value: 'approve', props: { disabled: !selectedRequest.tankId } }, { title: 'Từ chối', value: 'reject' }]" label="Kết quả xử lý *" :rules="[required]" :disabled="processing" />
              <v-textarea v-if="decision === 'reject'" v-model="rejectionReason" label="Lý do từ chối *" maxlength="4000" rows="3" :rules="[value => Boolean(String(value || '').trim()) || 'Nhập lý do từ chối.', value => String(value || '').trim().length <= 4000 || 'Tối đa 4.000 ký tự.']" :disabled="processing" />
              <v-alert v-if="processingError" type="error" variant="tonal" class="mb-3" role="alert">{{ processingError }}</v-alert>
              <div class="detail-actions"><v-btn type="submit" color="primary" :loading="processing">Lưu xử lý</v-btn></div>
            </v-form>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn :disabled="processing" @click="detailDialog = false">Đóng</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    </section>
  </AppShell>
</template>

<style scoped>
.request-row { cursor: pointer; }
.request-row:hover { background: #f3faf8; }
.request-row:focus-visible { outline: 2px solid #087f6e; outline-offset: -2px; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 0 0 24px; }
.detail-grid dt { color: #71827e; font-size: 12px; }
.detail-grid dd { margin: 4px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.detail-wide { grid-column: 1 / -1; }
.detail-actions { display: flex; justify-content: flex-end; }
@media(max-width:600px) { .detail-grid { grid-template-columns: 1fr; } }

.requests-page{color:#173f3a}.page-heading{margin-bottom:22px}.eyebrow{margin:0 0 8px;color:#078575;font-size:10px;font-weight:800;letter-spacing:1px}h1{margin:0;font-size:29px;line-height:1.2;font-weight:800}.subtitle{margin:8px 0 0;color:#71827e;font-size:13px}.request-form,.request-list{padding:20px 0;border-top:1px solid #dbe9e5}h2{display:flex;justify-content:space-between;margin:0 0 14px;font-size:17px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:8px 14px}.table-wrap{overflow:auto;border:1px solid #dbe9e5;border-radius:8px;background:#fff}.table-wrap :deep(th){color:#71827e;font-size:10px;text-transform:uppercase;white-space:nowrap}.table-wrap :deep(td){color:#34514c;font-size:12px}.table-wrap small{display:block;color:#83918e;font-size:10px}.empty-row{height:90px;text-align:center;color:#83918e!important}.state-message{padding:34px;text-align:center;color:#71827e}@media(max-width:760px){.form-grid{grid-template-columns:1fr}}
</style>
