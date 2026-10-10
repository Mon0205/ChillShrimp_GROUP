<script setup>
import AppShell from '../../components/shell/index.vue'
import LoadingIndicator from '../../components/loading/index.vue'
import { required, codeRule, maxLength } from '../../utils/validation.js'
import { useAuth } from '../../composables/auth.js'
import { computed, onMounted, ref } from 'vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const auth = useAuth()
const createDialog = ref(false), creatingFarm = ref(false)
const newFarm = ref({ code: '', name: '', address: '' })
const farmContext = useFarmContext()
const farms = ref([])
const areas = ref([])
const loading = ref(true)
const areasLoading = ref(false)
let areasRequest = 0
const saving = ref(false)
const areaSaving = ref(false)
const changingAreaStatus = ref(false)
const deletingArea = ref(false)
const error = ref('')
const farmDialog = ref(false)
const editingFarm = ref(null)
const areaDialog = ref(false)
const areaStatusDialog = ref(false)
const areaDeleteDialog = ref(false)
const editingArea = ref(null)
const selectedArea = ref(null)
const farmForm = ref({ code: '', name: '', address: '', status: 'active' })
const areaForm = ref({ code: '', name: '' })
const roleNames = { owner: 'Chủ trại', area_manager: 'Quản lý khu vực', technician: 'Nhân viên kỹ thuật', warehouse_staff: 'Nhân viên kho' }
const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const areasDialog = ref(false)
const areaFarmId = ref('')
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === areaFarmId.value))
const selectedRole = computed(() => selectedFarm.value?.role || '')
const canCreateFarm = computed(() => auth.user?.canCreateFarm === true)
const canManageAreas = computed(() => ['owner', 'area_manager'].includes(selectedRole.value))
const nextAreaStatus = computed(() => selectedArea.value?.status === 'active' ? 'inactive' : 'active')

async function loadFarms() {
  const result = await api('/farms?includeInactive=true')
  farms.value = result.data
  farmContext.farms = farms.value.filter(farm => farm.status === 'active')
  farmContext.ready = true
  if (!farmContext.farms.some((farm) => farm.id === farmId.value)) selectFarm(farmContext.farms[0]?.id || '')
}

async function loadAreas() {
  const request = ++areasRequest
  areas.value = []
  areasLoading.value = false
  if (!areasDialog.value || !selectedFarm.value || !canManageAreas.value || selectedFarm.value.status !== 'active') return
  areasLoading.value = true
  const query = selectedRole.value === 'owner' ? '?includeInactive=true' : ''
  try {
    const result = await api(`/farms/${encodeURIComponent(areaFarmId.value)}/areas${query}`)
    if (request === areasRequest) areas.value = result.data
  }
  catch (err) { if (request === areasRequest) showToast(err.message, 'error') }
  finally { if (request === areasRequest) areasLoading.value = false }
}

async function loadPage() {
  loading.value = true
  try { await loadFarms(); await loadAreas() }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
  finally { loading.value = false }
}

async function createFarm(event) {
  if (event?.then && !(await event).valid) return
  const code = newFarm.value.code.trim().toUpperCase(), name = newFarm.value.name.trim()
  if (!code || !name) { showToast('Vui lòng nhập mã và tên trại.', 'error'); return }
  creatingFarm.value = true
  try { const result = await api('/farms', { method: 'POST', body: JSON.stringify({ code, name, address: newFarm.value.address }) }); await loadFarms(); selectFarm(result.data.id); await loadAreas(); newFarm.value = { code: '', name: '', address: '' }; createDialog.value = false; showToast('Đã tạo trại mới.', 'success') } catch (err) { showToast(err.message, 'error') } finally { creatingFarm.value = false }
}

function openEditFarm(farm) {
  if (farm.role !== 'owner') return
  editingFarm.value = farm
  farmForm.value = { code: farm.code || '', name: farm.name || '', address: farm.address || '', status: farm.status === 'active' ? 'active' : 'inactive' }
  farmDialog.value = true
}

async function saveFarm() {
  if (!editingFarm.value || saving.value) return
  const code = farmForm.value.code.trim().toUpperCase()
  const name = farmForm.value.name.trim()
  if (!code || !name) { showToast('Vui lòng nhập mã và tên trang trại.', 'error'); return }
  saving.value = true
  try {
    const payload = { code, name, address: farmForm.value.address.trim(), status: farmForm.value.status }
    await api(`/farms/${encodeURIComponent(editingFarm.value.id)}`, { method: 'PATCH', body: JSON.stringify(payload) })
    await loadFarms()
    await loadAreas()
    farmDialog.value = false
    showToast('Đã cập nhật trang trại.', 'success')
  } catch (err) { showToast(err.message, 'error') }
  finally { saving.value = false }
}

function openCreateArea() {
  editingArea.value = null
  areaForm.value = { code: '', name: '' }
  areaDialog.value = true
}

function openEditArea(area) {
  editingArea.value = area
  areaForm.value = { code: area.code || '', name: area.name || '' }
  areaDialog.value = true
}

async function saveArea() {
  const code = areaForm.value.code.trim().toUpperCase()
  const name = areaForm.value.name.trim()
  if (!code || !name) { showToast('Vui lòng nhập mã và tên khu vực.', 'error'); return }
  areaSaving.value = true
  try {
    const baseUrl = `/farms/${encodeURIComponent(areaFarmId.value)}/areas`
    const url = editingArea.value ? `${baseUrl}/${encodeURIComponent(editingArea.value.id)}` : baseUrl
    await api(url, { method: editingArea.value ? 'PATCH' : 'POST', body: JSON.stringify({ code, name }) })
    await loadAreas()
    areaDialog.value = false
    showToast(editingArea.value ? 'Đã cập nhật khu vực.' : 'Đã tạo khu vực mới.', 'success')
  } catch (err) { showToast(err.message, 'error') }
  finally { areaSaving.value = false }
}

function openAreaStatus(area) {
  selectedArea.value = area
  areaStatusDialog.value = true
}

async function changeAreaStatus() {
  if (!selectedArea.value) return
  changingAreaStatus.value = true
  try {
    await api(`/farms/${encodeURIComponent(areaFarmId.value)}/areas/${encodeURIComponent(selectedArea.value.id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextAreaStatus.value }),
    })
    await loadAreas()
    areaStatusDialog.value = false
    showToast(nextAreaStatus.value === 'active' ? 'Đã kích hoạt khu vực.' : 'Đã ngừng hoạt động khu vực.', 'success')
  } catch (err) { showToast(err.message, 'error') }
  finally { changingAreaStatus.value = false }
}

function openDeleteArea(area) {
  selectedArea.value = area
  areaDeleteDialog.value = true
}

async function deleteArea() {
  if (!selectedArea.value) return
  deletingArea.value = true
  try {
    await api(`/farms/${encodeURIComponent(areaFarmId.value)}/areas/${encodeURIComponent(selectedArea.value.id)}`, { method: 'DELETE' })
    await loadAreas()
    areaDeleteDialog.value = false
    showToast('Đã xóa khu vực.', 'success')
  } catch (err) { showToast(err.message, 'error') }
  finally { deletingArea.value = false }
}

function openFarmAreas(farm) {
  areaFarmId.value = farm.id
  areasDialog.value = true
  loadAreas()
}
onMounted(loadPage)
</script>

<template>
<AppShell>
    <header class="page-header">
      <div><span class="eyebrow">THIẾT LẬP VẬN HÀNH</span><h1>Trang trại</h1><p>Quản lý thông tin trang trại và khu vực theo phạm vi được phân quyền.</p></div>
      <div class="page-actions"><v-btn v-if="canCreateFarm" color="primary" variant="outlined" prepend-icon="mdi-home-plus-outline" @click="createDialog = true">Tạo trại</v-btn></div>
    </header>

    <LoadingIndicator v-if="loading" />
    <template v-else-if="!farms.length">
      <v-card class="empty-card" elevation="0"><div class="empty-icon">+</div><h2>Chưa có trang trại</h2><p>Bạn chưa tham gia trang trại nào trong hệ thống.</p><v-btn v-if="canCreateFarm" color="primary" variant="outlined" prepend-icon="mdi-home-plus-outline" @click="createDialog = true">Tạo trại</v-btn></v-card>
    </template>
    <template v-else>
      <v-card class="farm-card" elevation="0">
        <div class="section-heading"><h2>Danh sách trang trại</h2><span class="archive-count">{{ farms.length }}</span></div>
        <div class="table-wrap">
          <v-table class="app-data-table farms-table">
            <thead><tr><th>Mã trại</th><th>Trang trại</th><th>Địa chỉ</th><th>Vai trò</th><th>Phạm vi</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              <tr v-for="farm in farms" :key="farm.id" class="farm-clickable-row" @click="openFarmAreas(farm)">
                <td><strong>{{ farm.code }}</strong></td>
                <td><div class="farm-name-cell"><button type="button" class="farm-link" @click.stop="openFarmAreas(farm)" :aria-label="`Xem khu vực của ${farm.name}`">{{ farm.name }}</button></div></td>
                <td class="farm-address-cell">{{ farm.address || 'Chưa cập nhật địa chỉ' }}</td>
                <td>{{ roleNames[farm.role] || 'Chưa xác định' }}</td>
                <td>{{ farm.area?.name || 'Toàn trại' }}</td>
                <td><v-chip :color="farm.status === 'active' ? 'success' : 'default'" variant="tonal" size="small">{{ farm.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động' }}</v-chip></td>
                <td @click.stop><div class="farm-row-actions"><v-btn v-if="farm.role === 'owner'" icon="mdi-pencil-outline" variant="text" color="primary" size="small" :aria-label="`Chỉnh sửa ${farm.name}`" :title="`Chỉnh sửa ${farm.name}`" @click="openEditFarm(farm)" /></div></td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

    </template>
    <v-dialog v-model="areasDialog" max-width="960" scrollable>
      <v-card class="areas-popup" elevation="0">
        <div class="areas-popup-header"><div><h2>Khu vực</h2><p>{{ selectedFarm?.name }}</p></div><v-btn icon="mdi-close" variant="text" aria-label="Đóng khu vực" @click="areasDialog = false" /></div>
        <v-card-text>
        <p v-if="selectedFarm?.status !== 'active'" class="popup-note">Kích hoạt trại để tiếp tục quản lý khu vực.</p>
        <p v-else-if="!canManageAreas" class="popup-note">Bạn chưa có quyền quản lý khu vực của trại này.</p>
        <template v-else>
        <div class="section-heading"><div><span class="eyebrow">{{ selectedFarm?.name }}</span><h2>Khu vực</h2></div><v-btn v-if="selectedRole === 'owner'" color="primary" size="small" @click="openCreateArea">Tạo khu vực</v-btn></div>
        <LoadingIndicator v-if="areasLoading" />
        <div v-else-if="!areas.length" class="inline-empty">Chưa có khu vực trong trang trại này.</div>
        <v-table v-else class="app-data-table areas-table">
          <thead><tr><th>Mã khu vực</th><th>Tên khu vực</th><th>Trạng thái</th><th v-if="selectedRole === 'owner'">Thao tác</th></tr></thead>
          <tbody><tr v-for="area in areas" :key="area.id">
            <td><strong>{{ area.code }}</strong></td><td>{{ area.name }}</td>
            <td><v-chip :color="area.status === 'active' ? 'success' : 'default'" variant="tonal" size="small">{{ area.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động' }}</v-chip></td>
            <td v-if="selectedRole === 'owner'"><div class="farm-row-actions">
              <v-btn icon="mdi-pencil-outline" variant="text" size="small" :aria-label="`Sửa ${area.name}`" :title="`Sửa ${area.name}`" @click="openEditArea(area)" />
              <v-btn :icon="area.status === 'active' ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline'" variant="text" size="small" :aria-label="area.status === 'active' ? 'Ngừng hoạt động khu vực' : 'Kích hoạt khu vực'" :title="area.status === 'active' ? 'Ngừng hoạt động' : 'Kích hoạt'" @click="openAreaStatus(area)" />
              <v-btn v-if="area.status === 'inactive'" icon="mdi-delete-outline" color="error" variant="text" size="small" aria-label="Xóa khu vực" title="Xóa khu vực" @click="openDeleteArea(area)" />
            </div></td>
          </tr></tbody>
        </v-table>
        </template>
        </v-card-text>
      </v-card>
    </v-dialog>
<v-dialog v-model="createDialog" max-width="520"><v-card class="dialog-card"><span class="eyebrow">THIẾT LẬP TRẠI</span><h2>Tạo trại mới</h2><v-form class="dialog-form" @submit.prevent="createFarm"><label>Mã trại</label><v-text-field :rules="[codeRule]" v-model="newFarm.code" placeholder="Ví dụ: CT001" @update:model-value="newFarm.code = newFarm.code.toUpperCase()" required/><label>Tên trại</label><v-text-field :rules="[required('tên'), maxLength(120)]" v-model="newFarm.name" hide-details="auto" required/><label>Địa chỉ <small>(không bắt buộc)</small></label><v-text-field v-model="newFarm.address" hide-details="auto"/><div class="dialog-actions"><v-btn variant="text" @click="createDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="creatingFarm">Tạo trại</v-btn></div></v-form></v-card></v-dialog>
<v-dialog v-model="farmDialog" max-width="520"><v-card class="dialog-card"><span class="eyebrow">CẬP NHẬT TRANG TRẠI</span><h2>Chỉnh sửa thông tin</h2><v-form class="dialog-form" @submit.prevent="saveFarm"><label>Mã trang trại</label><v-text-field v-model="farmForm.code" disabled @update:model-value="farmForm.code = farmForm.code.toUpperCase()" required hide-details="auto"/><label>Tên trang trại</label><v-text-field v-model="farmForm.name" required hide-details="auto"/><label>Địa chỉ</label><v-text-field v-model="farmForm.address" hide-details="auto"/><label>Trạng thái</label><v-select v-model="farmForm.status" :items="[{ title: 'Đang hoạt động', value: 'active' }, { title: 'Ngừng hoạt động', value: 'inactive' }]" hide-details="auto" /><div class="dialog-actions"><v-btn variant="text" @click="farmDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="saving">Lưu thay đổi</v-btn></div></v-form></v-card></v-dialog>
<v-dialog v-model="areaDialog" max-width="500"><v-card class="dialog-card"><span class="eyebrow">PHẠM VI PHÂN QUYỀN</span><h2>{{ editingArea ? 'Chỉnh sửa khu vực' : 'Tạo khu vực' }}</h2><v-form class="dialog-form" @submit.prevent="saveArea"><label>Mã khu vực</label><v-text-field v-model="areaForm.code" @update:model-value="areaForm.code = areaForm.code.toUpperCase()" required hide-details="auto"/><label>Tên khu vực</label><v-text-field v-model="areaForm.name" required hide-details="auto"/><div class="dialog-actions"><v-btn variant="text" @click="areaDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="areaSaving">{{ editingArea ? 'Lưu thay đổi' : 'Tạo khu vực' }}</v-btn></div></v-form></v-card></v-dialog>
<v-dialog v-model="areaStatusDialog" max-width="500">
      <v-card class="dialog-card">
        <span class="eyebrow">TRẠNG THÁI KHU VỰC</span>
        <h2>{{ nextAreaStatus === 'active' ? 'Kích hoạt khu vực' : 'Ngừng hoạt động khu vực' }}</h2>
        <p v-if="nextAreaStatus === 'inactive'">Khu vực <strong>{{ selectedArea?.name }}</strong> chỉ có thể ngừng hoạt động khi không còn thành viên đang hoạt động, lời mời đang chờ hoặc ao/bể chưa ngừng hoạt động.</p>
        <p v-else>Kích hoạt lại khu vực <strong>{{ selectedArea?.name }}</strong> để tiếp tục phân công nhân viên và quản lý ao/bể.</p>
        <div class="dialog-actions"><v-btn variant="text" @click="areaStatusDialog = false">Hủy</v-btn><v-btn color="primary" :loading="changingAreaStatus" @click="changeAreaStatus">Xác nhận</v-btn></div>
      </v-card>
    </v-dialog>
<v-dialog v-model="areaDeleteDialog" max-width="500">
      <v-card class="dialog-card">
        <span class="eyebrow eyebrow--danger">XÓA KHU VỰC</span>
        <h2>Xóa {{ selectedArea?.name }}?</h2>
        <p>Thao tác này không thể hoàn tác. Hệ thống chỉ cho phép xóa khu vực đã ngừng hoạt động và chưa có nhân viên, lời mời hoặc ao/bể liên kết.</p>
        <div class="dialog-actions"><v-btn variant="text" @click="areaDeleteDialog = false">Hủy</v-btn><v-btn color="error" :loading="deletingArea" @click="deleteArea">Xóa khu vực</v-btn></div>
      </v-card>
    </v-dialog>

  </AppShell>
</template>

<style scoped>
.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:26px}.page-header p{margin:0;color:#70817e;font-size:13px}.page-actions{display:flex;gap:10px}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.13em}.eyebrow--danger{color:#b42318}h1{margin:0 0 9px;color:#134e4a;font-size:clamp(1.85rem,3vw,2.55rem)}h2{margin:0;color:#134e4a;font-size:1.25rem}.selector-card,.farm-card,.areas-card,.empty-card{border:1px solid #dce7e4!important;border-radius:18px!important;background:white!important}.selector-card{display:flex;align-items:end;gap:16px;padding:18px 22px;margin-bottom:18px}.selector-card label{min-width:180px;color:#48625e;font-size:11px;font-weight:700}.selector-card .v-select{max-width:420px;flex:1}.farm-card,.areas-card{padding:26px}.farm-heading,.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.farm-heading{padding-bottom:20px;border-bottom:1px solid #e5ecea}.farm-heading p{margin:6px 0 0;color:#70817e;font-size:13px}.farm-meta{display:grid;gap:6px;text-align:right}.farm-meta span,.area-code{padding:6px 10px;border-radius:8px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.farm-meta small{color:#74837f;font-size:10px}.farm-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding-top:22px}.farm-details div{display:grid;gap:7px}.farm-details span{color:#82908d;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.farm-details strong{color:#365751;font-size:13px}.areas-card{margin-top:20px}.section-heading{align-items:center;margin-bottom:20px}.area-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.area-item{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px;padding:14px;border:1px solid #e5ecea;border-radius:12px}.area-item--inactive{border-color:#e4e7ec;background:#f8f9fa}.area-copy{display:grid;gap:5px;min-width:0}.area-copy strong{overflow:hidden;color:#365751;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.area-status{width:max-content;padding:3px 7px;border-radius:6px;font-size:9px;font-weight:700}.area-status--active{color:#087f6e;background:#e7f4f1}.area-status--inactive{color:#667085;background:#eaecf0}.area-actions{grid-column:1/-1;display:flex;gap:6px;padding-top:9px;border-top:1px solid #edf1f0}.area-action-btn{padding:5px 8px;border:0;border-radius:6px;color:#087f6e;background:transparent;font:inherit;font-size:10px;font-weight:700;cursor:pointer}.area-action-btn:hover{background:#e7f4f1}.area-action-btn--danger{margin-left:auto;color:#b42318}.area-action-btn--danger:hover{background:#fee4e2}.inline-empty,.permission-note{padding:18px;border:1px dashed #b9d6d0;border-radius:12px;color:#647975;background:#f8fcfb;font-size:12px}.permission-note{margin-top:20px}.empty-card{padding:46px;text-align:center}.empty-icon{width:48px;height:48px;display:grid;place-items:center;margin:0 auto 14px;border-radius:14px;color:#087f6e;background:#e7f4f1;font-size:25px}.empty-card p{margin:8px 0 20px;color:#70817e;font-size:13px}.dialog-card{padding:30px;border-radius:20px!important}.dialog-card>p{margin:16px 0 0;color:#647975;font-size:12px;line-height:1.7}.dialog-form{display:grid;gap:9px;margin-top:23px}.dialog-form label{color:#48625e;font-size:11px;font-weight:700}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}@media(max-width:760px){.page-header,.selector-card{align-items:stretch;flex-direction:column}.page-actions .v-btn{flex:1}.selector-card label{min-width:0}.farm-heading{flex-direction:column}.farm-meta{text-align:left}.farm-details,.area-grid{grid-template-columns:1fr}.farm-card,.areas-card{padding:20px}.empty-card{padding:34px 22px}}
.archived-card{padding:26px;margin-top:20px;border:1px solid #e4e7ec!important;border-radius:18px!important;background:#fafafa!important}.archive-count{min-width:32px;height:28px;display:grid;place-items:center;border-radius:8px;color:#667085;background:#eaecf0;font-size:10px;font-weight:800}.archived-list{display:grid;gap:9px}.archived-item{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px;border:1px solid #e4e7ec;border-radius:10px;background:white}.archived-item strong,.archived-item small{display:block}.archived-item strong{color:#344054;font-size:12px}.archived-item small{margin-top:4px;color:#7b8583;font-size:10px}@media(max-width:760px){.archived-card{padding:20px}.archived-item{align-items:stretch;flex-direction:column}}
.farm-name-cell { display: flex; align-items: center; gap: 8px; min-width: 190px; }
.farm-link { color: #087f6e; font: inherit; font-weight: 600; text-align: left; background: transparent; border: 0; cursor: pointer; }
.farm-link:hover { text-decoration: underline; }
.farm-clickable-row { cursor: pointer; }
.areas-popup { background: #fff; border-radius: 16px !important; }
.areas-popup-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 24px; border-bottom: 1px solid #dce7e4; }
.areas-popup-header p { margin: 6px 0 0; font-size: 14px; color: #70817e; }
.areas-popup :deep(.v-card-text) { padding: 24px; }
.popup-note { color: #70817e; font-size: 14px; }
.areas-table :deep(td:nth-child(2)) { min-width: 180px; }
@media (max-width: 760px) { .areas-popup-header, .areas-popup :deep(.v-card-text) { padding: 16px; } }
.farm-row-actions { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.farm-address-cell { min-width: 180px; max-width: 280px; white-space: normal; }
.farms-table :deep(td) { vertical-align: middle; }
.farm-card { padding: 24px; }
.farms-table :deep(tbody) { background: #fff; }
@media (max-width: 760px) { .farm-card { padding: 16px; } }

.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:26px}.page-header p{margin:0;color:#70817e;font-size:13px}.page-actions{display:flex;gap:10px}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.13em}.eyebrow--danger{color:#b42318}h1{margin:0 0 9px;color:#134e4a;font-size:clamp(1.85rem,3vw,2.55rem)}h2{margin:0;color:#134e4a;font-size:1.25rem}.selector-card,.farm-card,.areas-card,.empty-card{border:1px solid #dce7e4!important;border-radius:18px!important;background:white!important}.selector-card{display:flex;align-items:end;gap:16px;padding:18px 22px;margin-bottom:18px}.selector-card label{min-width:180px;color:#48625e;font-size:11px;font-weight:700}.selector-card .v-select{max-width:420px;flex:1}.farm-card,.areas-card{padding:26px}.farm-heading,.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.farm-heading{padding-bottom:20px;border-bottom:1px solid #e5ecea}.farm-heading p{margin:6px 0 0;color:#70817e;font-size:13px}.farm-meta{display:grid;gap:6px;text-align:right}.farm-meta span,.area-code{padding:6px 10px;border-radius:8px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.farm-meta small{color:#74837f;font-size:10px}.farm-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding-top:22px}.farm-details div{display:grid;gap:7px}.farm-details span{color:#82908d;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.farm-details strong{color:#365751;font-size:13px}.areas-card{margin-top:20px}.section-heading{align-items:center;margin-bottom:20px}.area-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.area-item{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px;padding:14px;border:1px solid #e5ecea;border-radius:12px}.area-item--inactive{border-color:#e4e7ec;background:#f8f9fa}.area-copy{display:grid;gap:5px;min-width:0}.area-copy strong{overflow:hidden;color:#365751;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.area-status{width:max-content;padding:3px 7px;border-radius:6px;font-size:9px;font-weight:700}.area-status--active{color:#087f6e;background:#e7f4f1}.area-status--inactive{color:#667085;background:#eaecf0}.area-actions{grid-column:1/-1;display:flex;gap:6px;padding-top:9px;border-top:1px solid #edf1f0}.area-action-btn{padding:5px 8px;border:0;border-radius:6px;color:#087f6e;background:transparent;font:inherit;font-size:10px;font-weight:700;cursor:pointer}.area-action-btn:hover{background:#e7f4f1}.area-action-btn--danger{margin-left:auto;color:#b42318}.area-action-btn--danger:hover{background:#fee4e2}.inline-empty,.permission-note{padding:18px;border:1px dashed #b9d6d0;border-radius:12px;color:#647975;background:#f8fcfb;font-size:12px}.permission-note{margin-top:20px}.empty-card{padding:46px;text-align:center}.empty-icon{width:48px;height:48px;display:grid;place-items:center;margin:0 auto 14px;border-radius:14px;color:#087f6e;background:#e7f4f1;font-size:25px}.empty-card p{margin:8px 0 20px;color:#70817e;font-size:13px}.dialog-card{padding:30px;border-radius:20px!important}.dialog-card>p{margin:16px 0 0;color:#647975;font-size:12px;line-height:1.7}.dialog-form{display:grid;gap:9px;margin-top:23px}.dialog-form label{color:#48625e;font-size:11px;font-weight:700}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}@media(max-width:760px){.page-header,.selector-card{align-items:stretch;flex-direction:column}.page-actions .v-btn{flex:1}.selector-card label{min-width:0}.farm-heading{flex-direction:column}.farm-meta{text-align:left}.farm-details,.area-grid{grid-template-columns:1fr}.farm-card,.areas-card{padding:20px}.empty-card{padding:34px 22px}}
.archived-card{padding:26px;margin-top:20px;border:1px solid #e4e7ec!important;border-radius:18px!important;background:#fafafa!important}.archive-count{min-width:32px;height:28px;display:grid;place-items:center;border-radius:8px;color:#667085;background:#eaecf0;font-size:10px;font-weight:800}.archived-list{display:grid;gap:9px}.archived-item{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px;border:1px solid #e4e7ec;border-radius:10px;background:white}.archived-item strong,.archived-item small{display:block}.archived-item strong{color:#344054;font-size:12px}.archived-item small{margin-top:4px;color:#7b8583;font-size:10px}@media(max-width:760px){.archived-card{padding:20px}.archived-item{align-items:stretch;flex-direction:column}}
.farm-name-cell { display: flex; align-items: center; gap: 8px; min-width: 190px; }
.farm-link { color: #087f6e; font: inherit; font-weight: 600; text-align: left; background: transparent; border: 0; cursor: pointer; }
.farm-link:hover { text-decoration: underline; }
.farm-clickable-row { cursor: pointer; }
.areas-popup { background: #fff; border-radius: 16px !important; }
.areas-popup-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 24px; border-bottom: 1px solid #dce7e4; }
.areas-popup-header p { margin: 6px 0 0; font-size: 14px; color: #70817e; }
.areas-popup :deep(.v-card-text) { padding: 24px; }
.popup-note { color: #70817e; font-size: 14px; }
.areas-table :deep(td:nth-child(2)) { min-width: 180px; }
@media (max-width: 760px) { .areas-popup-header, .areas-popup :deep(.v-card-text) { padding: 16px; } }
.farm-row-actions { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.farm-address-cell { min-width: 180px; max-width: 280px; white-space: normal; }
.farms-table :deep(td) { vertical-align: middle; }
.farm-card { padding: 24px; }
.farms-table :deep(tbody) { background: #fff; }
@media (max-width: 760px) { .farm-card { padding: 16px; } }
</style>
