<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const farms = ref([])
const areas = ref([])
const loading = ref(true)
const areasLoading = ref(false)
const saving = ref(false)
const creatingArea = ref(false)
const error = ref('')
const farmDialog = ref(false)
const areaDialog = ref(false)
const editing = ref(false)
const farmForm = ref({ code: '', name: '', address: '' })
const areaForm = ref({ code: '', name: '' })
const roleNames = { owner: 'Chủ trại', area_manager: 'Quản lý khu vực', technician: 'Nhân viên kỹ thuật', warehouse_staff: 'Nhân viên kho' }
const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const selectedRole = computed(() => selectedFarm.value?.role || '')
const canCreateFarm = computed(() => !farms.value.length || farms.value.some((farm) => farm.role === 'owner'))
const canEditFarm = computed(() => selectedRole.value === 'owner')
const canManageAreas = computed(() => ['owner', 'area_manager'].includes(selectedRole.value))

async function loadFarms() {
  const result = await api('/farms')
  farms.value = result.data
  farmContext.farms = result.data
  farmContext.ready = true
  if (!farms.value.some((farm) => farm.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
}

async function loadAreas() {
  areas.value = []
  if (!selectedFarm.value || !canManageAreas.value) return
  areasLoading.value = true
  try { areas.value = (await api(`/farms/${encodeURIComponent(farmId.value)}/areas`)).data }
  catch (err) { showToast(err.message, 'error') }
  finally { areasLoading.value = false }
}

async function loadPage() {
  loading.value = true
  try { await loadFarms(); await loadAreas() }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
  finally { loading.value = false }
}

function openCreateFarm() {
  editing.value = false
  farmForm.value = { code: '', name: '', address: '' }
  farmDialog.value = true
}

function openEditFarm() {
  if (!selectedFarm.value) return
  editing.value = true
  farmForm.value = { code: selectedFarm.value.code || '', name: selectedFarm.value.name || '', address: selectedFarm.value.address || '' }
  farmDialog.value = true
}

async function saveFarm() {
  const code = farmForm.value.code.trim().toUpperCase()
  const name = farmForm.value.name.trim()
  if (!code || !name) { showToast('Vui lòng nhập mã và tên trang trại.', 'error'); return }
  saving.value = true
  try {
    const payload = { code, name, address: farmForm.value.address.trim() }
    if (editing.value) await api(`/farms/${encodeURIComponent(farmId.value)}`, { method: 'PATCH', body: JSON.stringify(payload) })
    else { const result = await api('/farms', { method: 'POST', body: JSON.stringify(payload) }); selectFarm(result.data.id) }
    await loadFarms()
    farmDialog.value = false
    showToast(editing.value ? 'Đã cập nhật trang trại.' : 'Đã tạo trang trại mới.', 'success')
  } catch (err) { showToast(err.message, 'error') }
  finally { saving.value = false }
}

function openCreateArea() {
  areaForm.value = { code: '', name: '' }
  areaDialog.value = true
}

async function createArea() {
  const code = areaForm.value.code.trim().toUpperCase()
  const name = areaForm.value.name.trim()
  if (!code || !name) { showToast('Vui lòng nhập mã và tên khu vực.', 'error'); return }
  creatingArea.value = true
  try {
    await api(`/farms/${encodeURIComponent(farmId.value)}/areas`, { method: 'POST', body: JSON.stringify({ code, name }) })
    await loadAreas()
    areaDialog.value = false
    showToast('Đã tạo khu vực mới.', 'success')
  } catch (err) { showToast(err.message, 'error') }
  finally { creatingArea.value = false }
}

watch(() => farmContext.farmId, loadAreas)
onMounted(loadPage)
</script>

<template>
  <AppShell>
    <header class="page-header">
      <div><span class="eyebrow">THIẾT LẬP VẬN HÀNH</span><h1>Trang trại</h1><p>Quản lý thông tin trang trại và khu vực theo phạm vi được phân quyền.</p></div>
      <div class="page-actions"><v-btn v-if="canCreateFarm" color="primary" variant="outlined" @click="openCreateFarm">Tạo trang trại</v-btn><v-btn v-if="canEditFarm" color="primary" variant="outlined" @click="openEditFarm">Chỉnh sửa thông tin</v-btn></div>
    </header>

    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />
    <template v-else-if="!farms.length">
      <v-card class="empty-card" elevation="0"><div class="empty-icon">+</div><h2>Chưa có trang trại</h2><p>Bạn chưa tham gia trang trại nào trong hệ thống.</p><v-btn v-if="canCreateFarm" color="primary" @click="openCreateFarm">Tạo trang trại đầu tiên</v-btn></v-card>
    </template>
    <template v-else>
      <v-card class="selector-card" elevation="0"><label>Trang trại đang làm việc</label><v-select v-model="farmId" :items="farms" item-title="name" item-value="id" density="comfortable" variant="outlined" hide-details /></v-card>
      <v-card class="farm-card" elevation="0">
        <div class="farm-heading"><div><span class="eyebrow">THÔNG TIN TRANG TRẠI</span><h2>{{ selectedFarm?.name }}</h2><p>{{ selectedFarm?.address || 'Chưa cập nhật địa chỉ' }}</p></div><div class="farm-meta"><span>{{ selectedFarm?.code }}</span><small>{{ roleNames[selectedRole] }}</small></div></div>
        <div class="farm-details"><div><span>Mã farm</span><strong>{{ selectedFarm?.code }}</strong></div><div><span>Vai trò</span><strong>{{ roleNames[selectedRole] || 'Chưa xác định' }}</strong></div><div><span>Phạm vi</span><strong>{{ selectedFarm?.area?.name || 'Toàn trại' }}</strong></div></div>
      </v-card>

      <v-card v-if="canManageAreas" class="areas-card" elevation="0">
        <div class="section-heading"><div><span class="eyebrow">PHẠM VI PHÂN QUYỀN</span><h2>Khu vực</h2></div><v-btn v-if="selectedRole === 'owner'" color="primary" size="small" @click="openCreateArea">Tạo khu vực</v-btn></div>
        <v-progress-linear v-if="areasLoading" indeterminate color="primary" rounded />
        <div v-else-if="!areas.length" class="inline-empty">Chưa có khu vực trong trang trại này.</div>
        <div v-else class="area-grid"><div v-for="area in areas" :key="area.id" class="area-item"><span class="area-code">{{ area.code }}</span><strong>{{ area.name }}</strong></div></div>
      </v-card>
      <div v-else class="permission-note">Bạn có thể xem thông tin trang trại, nhưng hiện chưa có quyền quản lý khu vực.</div>
    </template>

    <v-dialog v-model="farmDialog" max-width="520"><v-card class="dialog-card"><span class="eyebrow">{{ editing ? 'CẬP NHẬT TRANG TRẠI' : 'TẠO TRANG TRẠI' }}</span><h2>{{ editing ? 'Chỉnh sửa thông tin' : 'Trang trại mới' }}</h2><v-form class="dialog-form" @submit.prevent="saveFarm"><label>Mã trang trại</label><v-text-field v-model="farmForm.code" :disabled="editing" @update:model-value="farmForm.code = farmForm.code.toUpperCase()" required hide-details="auto"/><label>Tên trang trại</label><v-text-field v-model="farmForm.name" required hide-details="auto"/><label>Địa chỉ</label><v-text-field v-model="farmForm.address" hide-details="auto"/><div class="dialog-actions"><v-btn variant="text" @click="farmDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="saving">{{ editing ? 'Lưu thay đổi' : 'Tạo trang trại' }}</v-btn></div></v-form></v-card></v-dialog>
    <v-dialog v-model="areaDialog" max-width="500"><v-card class="dialog-card"><span class="eyebrow">PHẠM VI PHÂN QUYỀN</span><h2>Tạo khu vực</h2><v-form class="dialog-form" @submit.prevent="createArea"><label>Mã khu vực</label><v-text-field v-model="areaForm.code" @update:model-value="areaForm.code = areaForm.code.toUpperCase()" required hide-details="auto"/><label>Tên khu vực</label><v-text-field v-model="areaForm.name" required hide-details="auto"/><div class="dialog-actions"><v-btn variant="text" @click="areaDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="creatingArea">Tạo khu vực</v-btn></div></v-form></v-card></v-dialog>
  </AppShell>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:26px}.page-header p{margin:0;color:#70817e;font-size:13px}.page-actions{display:flex;gap:10px}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.13em}h1{margin:0 0 9px;color:#134e4a;font-size:clamp(1.85rem,3vw,2.55rem)}h2{margin:0;color:#134e4a;font-size:1.25rem}.selector-card,.farm-card,.areas-card,.empty-card{border:1px solid #dce7e4!important;border-radius:18px!important;background:white!important}.selector-card{display:flex;align-items:end;gap:16px;padding:18px 22px;margin-bottom:18px}.selector-card label{min-width:180px;color:#48625e;font-size:11px;font-weight:700}.selector-card .v-select{max-width:420px;flex:1}.farm-card,.areas-card{padding:26px}.farm-heading,.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.farm-heading{padding-bottom:20px;border-bottom:1px solid #e5ecea}.farm-heading p{margin:6px 0 0;color:#70817e;font-size:13px}.farm-meta{display:grid;gap:6px;text-align:right}.farm-meta span,.area-code{padding:6px 10px;border-radius:8px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.farm-meta small{color:#74837f;font-size:10px}.farm-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding-top:22px}.farm-details div{display:grid;gap:7px}.farm-details span{color:#82908d;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.farm-details strong{color:#365751;font-size:13px}.areas-card{margin-top:20px}.section-heading{align-items:center;margin-bottom:20px}.area-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.area-item{display:flex;align-items:center;gap:10px;padding:14px;border:1px solid #e5ecea;border-radius:12px}.area-item strong{color:#365751;font-size:12px}.inline-empty,.permission-note{padding:18px;border:1px dashed #b9d6d0;border-radius:12px;color:#647975;background:#f8fcfb;font-size:12px}.permission-note{margin-top:20px}.empty-card{padding:46px;text-align:center}.empty-icon{width:48px;height:48px;display:grid;place-items:center;margin:0 auto 14px;border-radius:14px;color:#087f6e;background:#e7f4f1;font-size:25px}.empty-card p{margin:8px 0 20px;color:#70817e;font-size:13px}.dialog-card{padding:30px;border-radius:20px!important}.dialog-form{display:grid;gap:9px;margin-top:23px}.dialog-form label{color:#48625e;font-size:11px;font-weight:700}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}@media(max-width:760px){.page-header,.selector-card{align-items:stretch;flex-direction:column}.page-actions .v-btn{flex:1}.selector-card label{min-width:0}.farm-heading{flex-direction:column}.farm-meta{text-align:left}.farm-details,.area-grid{grid-template-columns:1fr}.farm-card,.areas-card{padding:20px}.empty-card{padding:34px 22px}}
</style>
