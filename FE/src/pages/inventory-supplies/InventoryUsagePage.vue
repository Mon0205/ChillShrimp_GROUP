<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const farms = ref([])
const supplies = ref([])
const batches = ref([])
const transactions = ref([])
const loading = ref(true)
const listLoading = ref(false)
const saving = ref(false)
const error = ref('')
const formRef = ref(null)
const dialog = ref(false)
const page = ref(1)
const pageSize = 50
const pagination = ref({ total: 0, pageCount: 1 })
const form = ref(emptyForm())

const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const role = computed(() => selectedFarm.value?.role || '')
const isTechnician = computed(() => role.value === 'technician')
const pageCount = computed(() => Math.max(1, pagination.value.pageCount || 1))
const chosenSupply = computed(() => supplies.value.find((supply) => supply.id === form.value.supplyId))
const supplyRule = (value) => Boolean(value) || 'Vui lòng chọn vật tư.'
const quantityRule = (value) => {
  if (value === '' || !Number.isFinite(Number(value)) || Number(value) <= 0) return 'Số lượng phải lớn hơn 0.'
  if (Math.abs(Number(value) * 1000 - Math.round(Number(value) * 1000)) > 1e-7) return 'Tối đa 3 chữ số thập phân.'
  if (chosenSupply.value && Number(value) > Number(chosenSupply.value.quantity)) return 'Số lượng vượt tồn kho hiện tại.'
  return true
}
const batchRule = (value) => !isTechnician.value || Boolean(value) || 'Technician phải chọn lô trong khu vực được phân công.'
const dateRule = (value) => Boolean(value) && !Number.isNaN(new Date(value).getTime()) || 'Thời điểm sử dụng không hợp lệ.'

function emptyForm() {
  return {
    supplyId: '',
    batchId: '',
    quantity: '',
    transactionDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    notes: '',
  }
}

function farmUrl(path = '') { return `/farms/${encodeURIComponent(farmId.value)}${path}` }
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

async function loadOptions() {
  supplies.value = []
  batches.value = []
  if (!farmId.value) return
  const [supplyResult, activeResult, readyResult] = await Promise.all([
    api(farmUrl('/inventory-supplies?limit=100')),
    api(farmUrl('/seed-batches?status=active&limit=100')),
    api(farmUrl('/seed-batches?status=ready_for_sale&limit=100')),
  ])
  supplies.value = supplyResult.data.items
  batches.value = [...activeResult.data.items, ...readyResult.data.items]
}

async function loadTransactions() {
  if (!farmId.value) { transactions.value = []; return }
  listLoading.value = true
  error.value = ''
  try {
    const result = await api(farmUrl(`/inventory-transactions?type=usage&page=${page.value}&limit=${pageSize}`))
    transactions.value = result.data.items
    pagination.value = result.data.pagination
  } catch (err) {
    transactions.value = []
    error.value = err.message
    showToast(err.message, 'error')
  } finally { listLoading.value = false }
}

async function loadPage() {
  loading.value = true
  error.value = ''
  try { await loadFarms(); await Promise.all([loadOptions(), loadTransactions()]) }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
  finally { loading.value = false }
}

function openCreate() { form.value = { ...emptyForm(), batchId: batches.value[0]?.id || '' }; dialog.value = true }

async function saveUsage() {
  const validation = await formRef.value?.validate()
  if (!validation?.valid) return showToast('Vui lòng kiểm tra các trường chưa hợp lệ.', 'error')
  if (form.value.notes.length > 4000) return showToast('Ghi chú tối đa 4.000 ký tự.', 'error')
  saving.value = true
  try {
    await api(farmUrl('/inventory-transactions/usage'), {
      method: 'POST',
      body: JSON.stringify({
        supplyId: form.value.supplyId,
        batchId: form.value.batchId || null,
        quantity: Number(form.value.quantity),
        transactionDate: new Date(form.value.transactionDate).toISOString(),
        notes: form.value.notes.trim() || null,
      }),
    })
    dialog.value = false
    showToast('Đã ghi nhận sử dụng vật tư và trừ tồn kho.', 'success')
    await Promise.all([loadOptions(), loadTransactions()])
  } catch (err) { showToast(err.message, 'error') }
  finally { saving.value = false }
}

watch(farmId, async () => {
  page.value = 1
  try { await Promise.all([loadOptions(), loadTransactions()]) }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
})

onMounted(loadPage)
</script>

<template>
  <AppShell>
    <section class="usage-page">
      <header class="page-heading">
        <div>
          <p class="eyebrow">KHO · UC07.5</p>
          <h1>Ghi nhận sử dụng vật tư</h1>
          <p class="subtitle">Mỗi lần ghi sẽ tạo giao dịch sử dụng và trừ tồn kho nguyên tử.</p>
        </div>
        <v-btn color="primary" prepend-icon="mdi-minus-circle-outline" :disabled="!supplies.length" @click="openCreate">Ghi sử dụng</v-btn>
      </header>

      <div class="policy-note">
        Khi chọn thức ăn tại UC05.4, hệ thống đã tự tạo giao dịch sử dụng và trừ tồn. Chỉ ghi thủ công cho lượng chưa được ghi nhận ở nhật ký cho ăn hoặc nhật ký xử lý khác.
      </div>

      <div v-if="loading" class="state-message">Đang tải giao dịch kho...</div>
      <div v-else-if="error" class="state-message error-state">{{ error }}</div>
      <div v-else-if="!farmId" class="state-message">Chọn trang trại để xem giao dịch.</div>
      <div v-else class="table-wrap">
        <v-table class="usage-table" density="comfortable">
          <thead><tr><th>Thời gian</th><th>Vật tư</th><th>Số lượng sử dụng</th><th>Lô/ao/bể</th><th>Người ghi</th><th>Ghi chú</th></tr></thead>
          <tbody>
            <tr v-for="item in transactions" :key="item.id">
              <td>{{ formatDateTime(item.transactionDate) }}</td>
              <td><strong>{{ item.supply.name }}</strong><small>{{ item.supply.category }}</small></td>
              <td>{{ formatNumber(item.quantity) }} {{ item.supply.unit }}</td>
              <td v-if="item.batch"><strong>{{ item.batch.batchCode }}</strong><small>{{ item.batch.tank.name }} · {{ item.batch.tank.code }}</small></td>
              <td v-else>Trang trại</td>
              <td>{{ item.creator.displayName || item.creator.email }}</td>
              <td class="notes-cell">{{ item.notes || '—' }}</td>
            </tr>
            <tr v-if="!listLoading && !transactions.length"><td colspan="6" class="empty-row">Chưa có giao dịch sử dụng vật tư.</td></tr>
          </tbody>
        </v-table>
        <div class="table-footer">
          <span>{{ pagination.total }} giao dịch</span>
          <div class="pager"><v-btn icon="mdi-chevron-left" variant="text" aria-label="Trang trước" :disabled="page <= 1 || listLoading" @click="page--; loadTransactions()" /><span>{{ page }} / {{ pageCount }}</span><v-btn icon="mdi-chevron-right" variant="text" aria-label="Trang sau" :disabled="page >= pageCount || listLoading" @click="page++; loadTransactions()" /></div>
        </div>
      </div>

      <v-dialog v-model="dialog" max-width="600">
        <v-card class="form-card">
          <v-card-title>Ghi nhận sử dụng</v-card-title>
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="saveUsage">
              <v-select v-model="form.supplyId" :items="supplies" item-title="name" item-value="id" label="Vật tư *" :rules="[supplyRule]">
                <template #item="{ props, item }"><v-list-item v-bind="props" :subtitle="`${item.raw.category} · Tồn ${formatNumber(item.raw.quantity)} ${item.raw.unit}`" /></template>
              </v-select>
              <v-alert v-if="chosenSupply?.category === 'feed'" type="info" variant="tonal" density="compact" class="form-alert">
                Nếu lượng thức ăn đã ghi trong UC05.4, không ghi lại ở đây để tránh trừ tồn hai lần.
              </v-alert>
              <v-text-field v-model="form.quantity" type="number" min="0.001" step="0.001" :label="`Số lượng sử dụng${chosenSupply ? ` (${chosenSupply.unit})` : ''} *`" :rules="[quantityRule]" :hint="chosenSupply ? `Tồn hiện tại: ${formatNumber(chosenSupply.quantity)} ${chosenSupply.unit}` : ''" persistent-hint />
              <v-select v-model="form.batchId" :items="batches" item-title="batchCode" item-value="id" label="Lô giống liên quan" clearable :rules="[batchRule]">
                <template #item="{ props, item }"><v-list-item v-bind="props" :subtitle="`${item.raw.tank.name} · ${item.raw.tank.code} · ${item.raw.species}`" /></template>
              </v-select>
              <v-text-field v-model="form.transactionDate" type="datetime-local" label="Thời điểm sử dụng *" :rules="[dateRule]" />
              <v-textarea v-model="form.notes" label="Ghi chú" rows="2" maxlength="4000" counter="4000" />
            </v-form>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="saving" @click="dialog = false">Hủy</v-btn><v-btn color="primary" :loading="saving" @click="saveUsage">Ghi và trừ tồn</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    </section>
  </AppShell>
</template>

<style scoped>
.usage-page { color:#173f3a; }
.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:20px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; }
h1 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { margin:8px 0 0; color:#71827e; font-size:13px; }
.policy-note { margin-bottom:16px; padding:12px 15px; border-left:3px solid #168b78; background:#eef8f5; color:#496760; font-size:12px; line-height:1.5; }
.state-message { padding:34px 20px; border:1px solid #dbe9e5; border-radius:8px; color:#71827e; background:#fff; text-align:center; }
.error-state { color:#a33b3b; }
.table-wrap { overflow:hidden; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }
.usage-table :deep(th) { color:#71827e; font-size:10px; font-weight:800; text-transform:uppercase; white-space:nowrap; }
.usage-table :deep(td) { color:#34514c; font-size:12px; }
.usage-table small { display:block; color:#83918e; font-size:10px; }
.notes-cell { max-width:260px; }
.empty-row { height:100px; color:#83918e !important; text-align:center; }
.table-footer { display:flex; align-items:center; justify-content:space-between; min-height:52px; padding:0 14px; border-top:1px solid #e5eeeb; color:#71827e; font-size:11px; }
.pager { display:flex; align-items:center; gap:8px; }
.form-card { border-radius:8px !important; }
.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }
.form-card :deep(.v-card-text) { padding:12px 22px; }
.form-alert { margin-bottom:12px; }
@media(max-width:760px) { .page-heading { align-items:flex-start; flex-direction:column; }.table-wrap { overflow-x:auto; } }
</style>
