<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const farms = ref([])
const supplies = ref([])
const areas = ref([])
const requests = ref([])
const loading = ref(true)
const submitting = ref(false)
const formRef = ref(null)
const form = ref({ supplyId: '', areaId: '', quantity: '', notes: '' })
const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const role = computed(() => farms.value.find((farm) => farm.id === farmId.value)?.role || '')
const canCreate = computed(() => ['owner', 'area_manager'].includes(role.value))
const hasStockRoles = computed(() => ['owner', 'area_manager', 'warehouse_staff'].includes(role.value))
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
  supplies.value = []
  areas.value = []
  if (!farmId.value || !hasStockRoles.value) return
  const [requestResult, supplyResult] = await Promise.all([
    api(farmUrl('/inventory-transactions/requests?limit=100')),
    canCreate.value ? api(farmUrl('/inventory-supplies?limit=100')) : Promise.resolve({ data: { items: [] } }),
  ])
  requests.value = requestResult.data.items
  supplies.value = supplyResult.data.items
  if (canCreate.value) areas.value = (await api(farmUrl('/areas'))).data
  if (!form.value.supplyId) form.value.supplyId = supplies.value[0]?.id || ''
  if (role.value === 'owner' && !form.value.areaId) form.value.areaId = areas.value[0]?.id || ''
}

async function submit() {
  const result = await formRef.value?.validate()
  if (!result?.valid) return
  if (form.value.notes.length > 4000) return showToast('Ghi chú tối đa 4.000 ký tự.', 'error')
  submitting.value = true
  try {
    await api(farmUrl('/inventory-transactions/requests'), {
      method: 'POST',
      body: JSON.stringify({ supplyId: form.value.supplyId, areaId: form.value.areaId || null, quantity: Number(form.value.quantity), notes: form.value.notes.trim() || null }),
    })
    form.value = { supplyId: supplies.value[0]?.id || '', areaId: role.value === 'owner' ? areas.value[0]?.id || '' : '', quantity: '', notes: '' }
    showToast('Đã gửi yêu cầu cấp vật tư.', 'success')
    await loadFarmData()
  } catch (error) { showToast(error.message, 'error') }
  finally { submitting.value = false }
}

watch(farmId, () => { form.value = { supplyId: '', areaId: '', quantity: '', notes: '' }; loadFarmData().catch((error) => showToast(error.message, 'error')) })
onMounted(load)
</script>

<template>
  <AppShell>
    <section class="requests-page">
      <header class="page-heading"><div><p class="eyebrow">KHO · UC07.3</p><h1>Yêu cầu cấp vật tư</h1><p class="subtitle">Gửi nhu cầu vật tư cho khu vực và theo dõi trạng thái xử lý.</p></div></header>
      <div v-if="loading" class="state-message">Đang tải yêu cầu...</div>
      <div v-else-if="!farmId" class="state-message">Chọn trang trại để xem yêu cầu.</div>
      <template v-else>
        <section v-if="canCreate" class="request-form">
          <h2>Tạo yêu cầu</h2>
          <v-form ref="formRef" @submit.prevent="submit">
            <div class="form-grid">
              <v-select v-model="form.supplyId" :items="supplies" item-title="name" item-value="id" label="Vật tư *" :rules="[required]" />
              <v-select v-if="role === 'owner'" v-model="form.areaId" :items="areas" item-title="name" item-value="id" label="Khu vực" clearable />
              <v-text-field v-model="form.quantity" type="number" min="0.001" step="0.001" label="Số lượng *" :rules="[required, positiveQuantity]" />
              <v-textarea v-model="form.notes" label="Ghi chú" rows="1" maxlength="4000" counter="4000" />
              <v-btn color="primary" prepend-icon="mdi-send-outline" :loading="submitting" @click="submit">Gửi yêu cầu</v-btn>
            </div>
          </v-form>
        </section>
        <section class="request-list">
          <h2>Danh sách yêu cầu <span>{{ requests.length }}</span></h2>
          <div class="table-wrap"><v-table density="comfortable">
            <thead><tr><th>Ngày gửi</th><th>Vật tư</th><th>Khu vực</th><th>Số lượng</th><th>Người yêu cầu</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
            <tbody>
              <tr v-for="item in requests" :key="item.id">
                <td>{{ dateTime(item.createdAt) }}</td><td><strong>{{ item.supply.name }}</strong><small>{{ item.supply.category }}</small></td>
                <td>{{ item.area?.name || 'Toàn trại' }}</td><td>{{ quantity(item.quantity) }} {{ item.supply.unit }}</td>
                <td>{{ item.requester.displayName || item.requester.email }}</td><td><v-chip size="small" color="warning" variant="tonal">{{ item.status === 'pending' ? 'Chờ xử lý' : item.status }}</v-chip></td><td>{{ item.notes || '—' }}</td>
              </tr>
              <tr v-if="!requests.length"><td colspan="7" class="empty-row">Chưa có yêu cầu cấp vật tư.</td></tr>
            </tbody>
          </v-table></div>
        </section>
      </template>
    </section>
  </AppShell>
</template>

<style scoped>
.requests-page{color:#173f3a}.page-heading{margin-bottom:22px}.eyebrow{margin:0 0 8px;color:#078575;font-size:10px;font-weight:800;letter-spacing:1px}h1{margin:0;font-size:29px;line-height:1.2;font-weight:800}.subtitle{margin:8px 0 0;color:#71827e;font-size:13px}.request-form,.request-list{padding:20px 0;border-top:1px solid #dbe9e5}h2{display:flex;justify-content:space-between;margin:0 0 14px;font-size:17px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:8px 14px}.table-wrap{overflow:auto;border:1px solid #dbe9e5;border-radius:8px;background:#fff}.table-wrap :deep(th){color:#71827e;font-size:10px;text-transform:uppercase;white-space:nowrap}.table-wrap :deep(td){color:#34514c;font-size:12px}.table-wrap small{display:block;color:#83918e;font-size:10px}.empty-row{height:90px;text-align:center;color:#83918e!important}.state-message{padding:34px;text-align:center;color:#71827e}@media(max-width:760px){.form-grid{grid-template-columns:1fr}}
</style>
