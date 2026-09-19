<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const farms = ref([])
const archivedFarms = ref([])
const areas = ref([])
const loading = ref(true)
const areasLoading = ref(false)
const saving = ref(false)
const archivingFarm = ref(false)
const restoringFarmId = ref('')
const areaSaving = ref(false)
const changingAreaStatus = ref(false)
const deletingArea = ref(false)
const error = ref('')
const farmDialog = ref(false)
const farmArchiveDialog = ref(false)
const areaDialog = ref(false)
const areaStatusDialog = ref(false)
const areaDeleteDialog = ref(false)
const editing = ref(false)
const editingArea = ref(null)
const selectedArea = ref(null)
const farmForm = ref({ code: '', name: '', address: '' })
const areaForm = ref({ code: '', name: '' })
const roleNames = { owner: 'Chủ trại', area_manager: 'Quản lý khu vực', technician: 'Nhân viên kỹ thuật', warehouse_staff: 'Nhân viên kho' }
const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const selectedRole = computed(() => selectedFarm.value?.role || '')
const canCreateFarm = computed(() => !farms.value.length || farms.value.some((farm) => farm.role === 'owner'))
const canEditFarm = computed(() => selectedRole.value === 'owner')
const canManageAreas = computed(() => ['owner', 'area_manager'].includes(selectedRole.value))
const nextAreaStatus = computed(() => selectedArea.value?.status === 'active' ? 'inactive' : 'active')

async function loadFarms() {
  const result = await api('/farms?includeArchived=true')
  farms.value = result.data.filter((farm) => farm.status !== 'archived')
  archivedFarms.value = result.data.filter((farm) => farm.status === 'archived')
  farmContext.farms = farms.value
  farmContext.ready = true
  if (!farms.value.some((farm) => farm.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
}

async function archiveFarm() {
  if (!selectedFarm.value) return
  archivingFarm.value = true
  try {
    await api(`/farms/${encodeURIComponent(selectedFarm.value.id)}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'archived' }) })
    farmArchiveDialog.value = false
    await loadFarms()
    await loadAreas()
    showToast('Đã lưu trữ trang trại.', 'success')
  } catch (err) { showToast(err.message, 'error') }
  finally { archivingFarm.value = false }
}

async function restoreFarm(farm) {
  restoringFarmId.value = farm.id
  try {
    await api(`/farms/${encodeURIComponent(farm.id)}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) })
    await loadFarms()
    selectFarm(farm.id)
    await loadAreas()
    showToast('Đã khôi phục trang trại.', 'success')
  } catch (err) { showToast(err.message, 'error') }
  finally { restoringFarmId.value = '' }
}

async function loadAreas() {
  areas.value = []
  if (!selectedFarm.value || !canManageAreas.value) return
  areasLoading.value = true
  const query = selectedRole.value === 'owner' ? '?includeInactive=true' : ''
  try { areas.value = (await api(`/farms/${encodeURIComponent(farmId.value)}/areas${query}`)).data }
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
    const baseUrl = `/farms/${encodeURIComponent(farmId.value)}/areas`
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
    await api(`/farms/${encodeURIComponent(farmId.value)}/areas/${encodeURIComponent(selectedArea.value.id)}/status`, {
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
    await api(`/farms/${encodeURIComponent(farmId.value)}/areas/${encodeURIComponent(selectedArea.value.id)}`, { method: 'DELETE' })
    await loadAreas()
    areaDeleteDialog.value = false
    showToast('Đã xóa khu vực.', 'success')
  } catch (err) { showToast(err.message, 'error') }
  finally { deletingArea.value = false }
}

watch(() => farmContext.farmId, loadAreas)
onMounted(loadPage)
</script>

<template>
  <AppShell>
    <header class="page-header">
      <div><span class="eyebrow">THIẾT LẬP VẬN HÀNH</span><h1>Trang trại</h1><p>Quản lý thông tin trang trại và khu vực theo phạm vi được phân quyền.</p></div>
      <div class="page-actions"><v-btn v-if="canCreateFarm" color="primary" variant="outlined" @click="openCreateFarm">Tạo trang trại</v-btn><v-btn v-if="canEditFarm" color="primary" variant="outlined" @click="openEditFarm">Chỉnh sửa thông tin</v-btn><v-btn v-if="canEditFarm" color="error" variant="text" @click="farmArchiveDialog = true">Lưu trữ</v-btn></div>
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
        <div v-else class="area-grid">
          <div v-for="area in areas" :key="area.id" class="area-item" :class="{ 'area-item--inactive': area.status === 'inactive' }">
            <span class="area-code">{{ area.code }}</span>
            <div class="area-copy">
              <strong>{{ area.name }}</strong>
              <small class="area-status" :class="`area-status--${area.status}`">{{ area.status === 'inactive' ? 'Ngừng hoạt động' : 'Đang hoạt động' }}</small>
            </div>
            <div v-if="selectedRole === 'owner'" class="area-actions">
              <button type="button" class="area-action-btn" @click="openEditArea(area)">Sửa</button>
              <button type="button" class="area-action-btn" @click="openAreaStatus(area)">{{ area.status === 'active' ? 'Ngừng' : 'Kích hoạt' }}</button>
              <button v-if="area.status === 'inactive'" type="button" class="area-action-btn area-action-btn--danger" @click="openDeleteArea(area)">Xóa</button>
            </div>
          </div>
        </div>
      </v-card>
      <div v-else class="permission-note">Bạn có thể xem thông tin trang trại, nhưng hiện chưa có quyền quản lý khu vực.</div>
    </template>

    <v-card v-if="archivedFarms.length" class="archived-card" elevation="0">
      <div class="section-heading"><div><span class="eyebrow">DỮ LIỆU LƯU TRỮ</span><h2>Trang trại đã lưu trữ</h2></div><span class="archive-count">{{ archivedFarms.length }}</span></div>
      <div class="archived-list">
        <div v-for="farm in archivedFarms" :key="farm.id" class="archived-item">
          <div><strong>{{ farm.name }}</strong><small>{{ farm.code }} · {{ farm.address || 'Chưa cập nhật địa chỉ' }}</small></div>
          <v-btn size="small" variant="outlined" color="primary" :loading="restoringFarmId === farm.id" @click="restoreFarm(farm)">Khôi phục</v-btn>
        </div>
      </div>
    </v-card>

    <v-dialog v-model="farmDialog" max-width="520"><v-card class="dialog-card"><span class="eyebrow">{{ editing ? 'CẬP NHẬT TRANG TRẠI' : 'TẠO TRANG TRẠI' }}</span><h2>{{ editing ? 'Chỉnh sửa thông tin' : 'Trang trại mới' }}</h2><v-form class="dialog-form" @submit.prevent="saveFarm"><label>Mã trang trại</label><v-text-field v-model="farmForm.code" :disabled="editing" @update:model-value="farmForm.code = farmForm.code.toUpperCase()" required hide-details="auto"/><label>Tên trang trại</label><v-text-field v-model="farmForm.name" required hide-details="auto"/><label>Địa chỉ</label><v-text-field v-model="farmForm.address" hide-details="auto"/><div class="dialog-actions"><v-btn variant="text" @click="farmDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="saving">{{ editing ? 'Lưu thay đổi' : 'Tạo trang trại' }}</v-btn></div></v-form></v-card></v-dialog>
    <v-dialog v-model="farmArchiveDialog" max-width="520"><v-card class="dialog-card"><span class="eyebrow eyebrow--danger">LƯU TRỮ TRANG TRẠI</span><h2>Lưu trữ {{ selectedFarm?.name }}?</h2><p>Trang trại sẽ bị ẩn khỏi không gian làm việc nhưng toàn bộ dữ liệu vẫn được giữ. Trước khi lưu trữ, cần ngừng các khu vực và ao/bể, xử lý lời mời đang chờ và ngừng tài khoản nhân viên.</p><div class="dialog-actions"><v-btn variant="text" @click="farmArchiveDialog = false">Hủy</v-btn><v-btn color="error" :loading="archivingFarm" @click="archiveFarm">Lưu trữ</v-btn></div></v-card></v-dialog>
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
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:26px}.page-header p{margin:0;color:#70817e;font-size:13px}.page-actions{display:flex;gap:10px}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.13em}.eyebrow--danger{color:#b42318}h1{margin:0 0 9px;color:#134e4a;font-size:clamp(1.85rem,3vw,2.55rem)}h2{margin:0;color:#134e4a;font-size:1.25rem}.selector-card,.farm-card,.areas-card,.empty-card{border:1px solid #dce7e4!important;border-radius:18px!important;background:white!important}.selector-card{display:flex;align-items:end;gap:16px;padding:18px 22px;margin-bottom:18px}.selector-card label{min-width:180px;color:#48625e;font-size:11px;font-weight:700}.selector-card .v-select{max-width:420px;flex:1}.farm-card,.areas-card{padding:26px}.farm-heading,.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.farm-heading{padding-bottom:20px;border-bottom:1px solid #e5ecea}.farm-heading p{margin:6px 0 0;color:#70817e;font-size:13px}.farm-meta{display:grid;gap:6px;text-align:right}.farm-meta span,.area-code{padding:6px 10px;border-radius:8px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.farm-meta small{color:#74837f;font-size:10px}.farm-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding-top:22px}.farm-details div{display:grid;gap:7px}.farm-details span{color:#82908d;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.farm-details strong{color:#365751;font-size:13px}.areas-card{margin-top:20px}.section-heading{align-items:center;margin-bottom:20px}.area-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.area-item{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px;padding:14px;border:1px solid #e5ecea;border-radius:12px}.area-item--inactive{border-color:#e4e7ec;background:#f8f9fa}.area-copy{display:grid;gap:5px;min-width:0}.area-copy strong{overflow:hidden;color:#365751;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.area-status{width:max-content;padding:3px 7px;border-radius:6px;font-size:9px;font-weight:700}.area-status--active{color:#087f6e;background:#e7f4f1}.area-status--inactive{color:#667085;background:#eaecf0}.area-actions{grid-column:1/-1;display:flex;gap:6px;padding-top:9px;border-top:1px solid #edf1f0}.area-action-btn{padding:5px 8px;border:0;border-radius:6px;color:#087f6e;background:transparent;font:inherit;font-size:10px;font-weight:700;cursor:pointer}.area-action-btn:hover{background:#e7f4f1}.area-action-btn--danger{margin-left:auto;color:#b42318}.area-action-btn--danger:hover{background:#fee4e2}.inline-empty,.permission-note{padding:18px;border:1px dashed #b9d6d0;border-radius:12px;color:#647975;background:#f8fcfb;font-size:12px}.permission-note{margin-top:20px}.empty-card{padding:46px;text-align:center}.empty-icon{width:48px;height:48px;display:grid;place-items:center;margin:0 auto 14px;border-radius:14px;color:#087f6e;background:#e7f4f1;font-size:25px}.empty-card p{margin:8px 0 20px;color:#70817e;font-size:13px}.dialog-card{padding:30px;border-radius:20px!important}.dialog-card>p{margin:16px 0 0;color:#647975;font-size:12px;line-height:1.7}.dialog-form{display:grid;gap:9px;margin-top:23px}.dialog-form label{color:#48625e;font-size:11px;font-weight:700}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}@media(max-width:760px){.page-header,.selector-card{align-items:stretch;flex-direction:column}.page-actions .v-btn{flex:1}.selector-card label{min-width:0}.farm-heading{flex-direction:column}.farm-meta{text-align:left}.farm-details,.area-grid{grid-template-columns:1fr}.farm-card,.areas-card{padding:20px}.empty-card{padding:34px 22px}}
.archived-card{padding:26px;margin-top:20px;border:1px solid #e4e7ec!important;border-radius:18px!important;background:#fafafa!important}.archive-count{min-width:32px;height:28px;display:grid;place-items:center;border-radius:8px;color:#667085;background:#eaecf0;font-size:10px;font-weight:800}.archived-list{display:grid;gap:9px}.archived-item{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px;border:1px solid #e4e7ec;border-radius:10px;background:white}.archived-item strong,.archived-item small{display:block}.archived-item strong{color:#344054;font-size:12px}.archived-item small{margin-top:4px;color:#7b8583;font-size:10px}@media(max-width:760px){.archived-card{padding:20px}.archived-item{align-items:stretch;flex-direction:column}}
</style>
