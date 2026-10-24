<script setup>
import Pagination from '../../components/pagination/index.vue'
import LoadingIndicator from '../../components/loading/index.vue'
import AppShell from '../../components/shell/index.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const farms = ref([])
const transactions = ref([])
const loading = ref(true)
const listLoading = ref(false)
const error = ref('')
const page = ref(1)
const pageSize = ref(10)
const pagination = ref({ total: 0, pageCount: 1 })

const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
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

async function loadTransactions() {
  if (!farmId.value) { transactions.value = []; return }
  listLoading.value = true
  error.value = ''
  try {
    const result = await api(farmUrl(`/inventory-transactions?type=usage&page=${page.value}&limit=${pageSize.value}`))
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
  try { await loadFarms(); await loadTransactions() }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
  finally { loading.value = false }
}

watch(farmId, async () => {
  page.value = 1
  try { await loadTransactions() }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
})

onMounted(loadPage)
watch(page, loadTransactions)
watch(pageSize, () => { if (page.value === 1) loadTransactions(); else page.value = 1 })
</script>

<template>
<AppShell>
    <section class="usage-page">
      <header class="page-heading">
        <div class="section-page-title"><v-avatar color="primary" variant="tonal" rounded="lg" size="44"><v-icon icon="mdi-package-variant-minus" size="25" /></v-avatar><h1>Lịch sử cấp vật tư</h1></div>
      </header>
      <p class="subtitle">Yêu cầu được duyệt sẽ tự động ghi vào lịch sử và trừ tồn kho. Các giao dịch cũ vẫn được giữ lại.</p>


      <LoadingIndicator v-if="loading" />
      <div v-else-if="error" class="state-message error-state">{{ error }}</div>
      <div v-else-if="!farmId" class="state-message">Chọn trang trại để xem giao dịch.</div>
      <div v-else class="table-wrap">
        <v-table class="app-data-table usage-table" density="comfortable">
          <thead><tr><th>Thời gian</th><th>Vật tư</th><th>Số lượng cấp</th><th>Khu vực / lô</th><th>Người duyệt / ghi</th><th>Ghi chú</th></tr></thead>
          <tbody>
            <tr v-for="item in transactions" :key="item.id">
              <td>{{ formatDateTime(item.transactionDate) }}</td>
              <td><strong>{{ item.supply.name }}</strong><small>{{ item.supply.category }}</small></td>
              <td>{{ formatNumber(item.quantity) }} {{ item.supply.unit }}</td>
              <td v-if="item.supplyRequest">{{ item.supplyRequest.area?.name || 'Toàn trại' }}<small v-if="item.supplyRequest.tank">{{ item.supplyRequest.tank.code }} · {{ item.supplyRequest.tank.name }}</small><small>Người yêu cầu: {{ item.supplyRequest.requester.displayName || item.supplyRequest.requester.email }}</small></td>
              <td v-else-if="item.batch"><strong>{{ item.batch.batchCode }}</strong><small>{{ item.batch.tank.name }} · {{ item.batch.tank.code }}</small></td>
              <td v-else>Trang trại</td>
              <td>{{ item.creator.displayName || item.creator.email }}</td>
              <td class="notes-cell">{{ item.notes || '—' }}</td>
            </tr>
            <tr v-if="!listLoading && !transactions.length"><td colspan="6" class="empty-row">Chưa có lịch sử cấp vật tư.</td></tr>
          </tbody>
        </v-table>
        <Pagination v-model:page="page" v-model:page-size="pageSize" :total="pagination.total" :loading="listLoading" />
      </div>


    </section>
  </AppShell>
</template>

<style scoped>
.usage-page { color:#173f3a; }
.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:20px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; }
h1 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { margin:8px 0 0; color:#71827e; font-size:13px; }
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

.usage-page { color:#173f3a; }
.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:20px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; }
h1 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { margin:8px 0 0; color:#71827e; font-size:13px; }
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
