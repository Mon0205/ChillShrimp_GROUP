<script setup>
import AppShell from '../../components/shell/index.vue'
import { required, emailRule, codeRule, maxLength } from '../../utils/validation.js'
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '../../composables/auth.js'
import { loadFarmContext, selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const auth = useAuth()
const farmContext = useFarmContext()
const manageableFarms = computed(() => farmContext.farms.filter(farm => ['owner', 'area_manager'].includes(farm.role)))
const search = ref('')
const invitations = ref([]), members = ref([]), showInvitations = ref(false)
const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const email = ref(''), role = ref('technician'), areaId = ref('')
const loading = ref(true), sending = ref(false), error = ref(''), success = ref('')
const inviteDialog = ref(false)
const editDialog = ref(false), savingUser = ref(false), editingUser = ref(null)
const editForm = ref({ displayName: '', email: '', phone: '', role: 'technician', areaId: '', status: 'active' })
const areaDialog = ref(false), creatingArea = ref(false)
const newArea = ref({ code: '', name: '' })
const roleNames = { owner: 'Chủ trại', area_manager: 'Quản lý khu vực', technician: 'Nhân viên kỹ thuật', warehouse_staff: 'Nhân viên kho' }
const selectedFarm = computed(() => manageableFarms.value.find((farm) => farm.id === farmId.value))
const areas = computed(() => selectedFarm.value?.areas || [])
const roleOptions = computed(() => selectedFarm.value?.role === 'owner' ? Object.entries(roleNames).map(([value, title]) => ({ title, value })) : [{ title: roleNames.technician, value: 'technician' }])
const needsArea = computed(() => ['area_manager', 'technician'].includes(role.value))
const userRows = computed(() => [...members.value.map((x) => ({ ...x, status: x.status || 'active', roleLabel: roleNames[x.role] })), ...(showInvitations.value ? invitations.value.map((x) => ({ ...x, status: 'pending', roleLabel: roleNames[x.role] })) : [])])
const canEditUser = (item) => item.status !== 'pending' && (selectedFarm.value?.role === 'owner' || (selectedFarm.value?.role === 'area_manager' && item.role === 'technician' && item.area?.id === selectedFarm.value?.area?.id))
const editNeedsArea = computed(() => ['area_manager', 'technician'].includes(editForm.value.role))
const revokingInvitation = ref(false)
const confirmation = ref(null)
const tableHeaders = [
  { title: 'Người dùng', key: 'email' }, { title: 'Chức vụ', key: 'role' },
  { title: 'Phạm vi', key: 'area.name' }, { title: 'Trạng thái', key: 'status' },
  { title: 'Ngày tham gia', key: 'createdAt' }, { title: 'Thao tác', key: 'actions', sortable: false, align: 'end' },
]
async function confirmAction() {
  if (revokingInvitation.value || !confirmation.value) return
  const pending = confirmation.value
  revokingInvitation.value = true
  try {
    await api(`/users/invitations/${encodeURIComponent(pending.item.id)}`, { method: 'DELETE' })
    confirmation.value = null
    if (farmId.value === pending.farmId) await loadFarmData()
    showToast('Đã thu hồi lời mời.')
  } catch (err) { error.value = err.message } finally { revokingInvitation.value = false }
}

async function loadFarms() {
  await loadFarmContext(true)
  if (!manageableFarms.value.some((farm) => farm.id === farmId.value)) selectFarm(manageableFarms.value[0]?.id || '')
}
async function loadFarmData() {
  const targetFarm = farmId.value
  if (!selectedFarm.value) { invitations.value = []; members.value = []; return }
  const [users] = await Promise.all([
    api(`/users?farmId=${encodeURIComponent(targetFarm)}`),
    showInvitations.value ? loadInvitations() : Promise.resolve(),
  ])
  if (farmId.value !== targetFarm) return
  members.value = users.data
  if (!areas.value.some((area) => area.id === areaId.value)) areaId.value = areas.value[0]?.id || ''
}
async function loadInvitations() {
  const targetFarm = farmId.value
  if (!selectedFarm.value) return
  const result = await api(`/users/invitations?farmId=${encodeURIComponent(targetFarm)}`)
  if (farmId.value === targetFarm && showInvitations.value) invitations.value = result.data
}
watch(showInvitations, async value => {
  if (value) { try { await loadInvitations() } catch (err) { error.value = err.message } }
})
onMounted(async () => { try { await loadFarms(); await loadFarmData() } catch (err) { error.value = err.message } finally { loading.value = false } })
watch(farmId, async () => {
  if (loading.value) return
  invitations.value = []; members.value = []
  error.value = ''; role.value = 'technician'
  try { await loadFarmData() } catch (err) { error.value = err.message }
})
watch(error, (message) => { if (message) { showToast(message, 'error'); error.value = '' } })
watch(success, (message) => { if (message) { showToast(message, 'success'); success.value = '' } })

async function sendInvite(event) {
  if (event?.then && !(await event).valid) return
  error.value = ''; success.value = ''; sending.value = true
  try {
    await api('/users/invitations', { method: 'POST', body: JSON.stringify({ farmId: farmId.value, email: email.value, role: role.value, areaId: needsArea.value ? areaId.value : null }) })
    success.value = `Đã gửi lời mời đến ${email.value}.`; email.value = ''; inviteDialog.value = false
    if (showInvitations.value) await loadInvitations()
  } catch (err) { error.value = err.message } finally { sending.value = false }
}
function revoke(item) {
  confirmation.value = { item, farmId: farmId.value, action: 'revoke', message: `Thu hồi lời mời đã gửi tới ${item.email}?` }
}
function openEdit(item) {
  editingUser.value = item
  editForm.value = { displayName: item.displayName || '', email: item.email, phone: item.phone || '', role: item.role, areaId: item.area?.id || '', status: item.status }
  error.value = ''; success.value = ''; editDialog.value = true
}
async function saveUser(event) {
  if (event?.then && !(await event).valid) return
  savingUser.value = true; error.value = ''; success.value = ''
  try {
    await api(`/users/${encodeURIComponent(editingUser.value.id)}`, { method: 'PATCH', body: JSON.stringify({ farmId: farmId.value, displayName: editForm.value.displayName, phone: editForm.value.phone, role: editForm.value.role, areaId: editNeedsArea.value ? editForm.value.areaId : null, status: editForm.value.status }) })
    success.value = `Đã cập nhật người dùng ${editForm.value.email}.`; editDialog.value = false; await loadFarmData()
  } catch (err) { error.value = err.message }
  finally { savingUser.value = false }
}
async function createArea(event) {
  if (event?.then && !(await event).valid) return
  const code = newArea.value.code.trim().toUpperCase(), name = newArea.value.name.trim()
  if (!code || !name) { error.value = 'Vui lòng nhập mã và tên khu vực.'; return }
  const targetFarm = selectedFarm.value
  if (!targetFarm) return
  creatingArea.value = true
  try { const result = await api(`/farms/${encodeURIComponent(targetFarm.id)}/areas`, { method: 'POST', body: JSON.stringify({ code, name }) }); targetFarm.areas = [...(targetFarm.areas || []), result.data].sort((a, b) => a.name.localeCompare(b.name, 'vi')); if (farmId.value === targetFarm.id) areaId.value = result.data.id; newArea.value = { code: '', name: '' }; areaDialog.value = false } catch (err) { error.value = err.message } finally { creatingArea.value = false }
}
const formatDate = (value) => {
  const date = new Date(value)
  const parts = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value || ''
  return `${get('hour')}:${get('minute')} ${get('day')}/${get('month')}/${get('year')}`
}
</script>

<template>
<AppShell>
    <header class="page-header">
      <div class="page-title"><v-avatar class="page-title-icon" color="primary" variant="tonal" rounded="lg" size="44"><v-icon icon="mdi-account-group-outline" size="25" /></v-avatar><h1>Người dùng</h1></div>
      <div class="page-actions"><v-btn v-if="manageableFarms.length" color="primary" prepend-icon="mdi-account-plus-outline" elevation="0" @click="inviteDialog = true">Thêm người dùng</v-btn></div>
    </header>
    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />
    <template v-else>
      <div v-if="!manageableFarms.length" class="permission-empty">Chức vụ hiện tại không có quyền quản lý người dùng.</div>
      <v-card v-else class="users-card" elevation="0">
        <div class="list-header"><div class="farm-heading"><div><span class="eyebrow">THÀNH VIÊN TRẠI</span><h2>{{ selectedFarm?.name }}</h2></div></div><v-chip color="primary" variant="tonal" prepend-icon="mdi-account-multiple-outline" size="small">{{ members.length }} thành viên</v-chip></div>
        <div class="table-toolbar"><v-text-field v-model="search" class="member-search" placeholder="Tìm tên, email hoặc chức vụ" aria-label="Tìm thành viên" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable /><v-switch class="invitation-toggle" v-model="showInvitations" label="Xem lời mời đang chờ" color="primary" density="compact" hide-details inset /></div>
        <v-data-table class="app-data-table members-table" :search="search || ''" :filter-keys="['email', 'displayName', 'roleLabel']" :headers="tableHeaders" :items="userRows" item-value="id" :items-per-page="10" no-data-text="Chưa có người dùng. Nhấn Thêm người dùng để gửi lời mời." items-per-page-text="Số dòng" page-text="{0}–{1} / {2}" no-results-text="Không tìm thấy thành viên phù hợp.">
          <template #item.email="{ item }"><div class="member-identity"><v-avatar color="primary" variant="tonal" rounded="lg" size="36">{{ (item.displayName || item.email).slice(0, 1).toUpperCase() }}</v-avatar><div class="member-copy"><strong>{{ item.displayName && item.displayName !== item.email ? item.displayName : item.email.split('@')[0] }}</strong><span>{{ item.email }}</span></div></div></template>
          <template #item.role="{ item }"><v-chip size="small" variant="tonal" color="primary">{{ roleNames[item.role] }}</v-chip></template>
          <template #item.area.name="{ item }"><span class="scope-cell"><v-icon :icon="item.area ? 'mdi-map-marker-outline' : 'mdi-home-outline'" size="16" />{{ item.area?.name || 'Toàn trại' }}</span></template>
          <template #item.status="{ item }"><v-chip size="small" :prepend-icon="item.status === 'active' ? 'mdi-check-circle-outline' : item.status === 'suspended' ? 'mdi-pause-circle-outline' : 'mdi-clock-outline'" :color="item.status === 'active' ? 'success' : item.status === 'suspended' ? 'error' : 'warning'">{{ item.status === 'active' ? 'Đang hoạt động' : item.status === 'suspended' ? 'Ngừng hoạt động' : 'Chờ xác nhận' }}</v-chip></template>
          <template #item.createdAt="{ item }"><span class="date-cell">{{ item.status === 'pending' ? 'Chưa tham gia' : formatDate(item.createdAt) }}</span></template>
          <template #item.actions="{ item }"><div class="d-flex align-center justify-end ga-1">
            <v-tooltip text="Chỉnh sửa thành viên" location="top"><template #activator="{ props }"><v-btn v-if="canEditUser(item)" v-bind="props" icon="mdi-pencil-outline" size="small" variant="tonal" color="primary" aria-label="Chỉnh sửa thành viên" @click="openEdit(item)" /></template></v-tooltip>
            <v-tooltip text="Thu hồi lời mời" location="top"><template #activator="{ props }"><v-btn v-if="item.status === 'pending'" v-bind="props" icon="mdi-email-remove-outline" size="small" variant="text" color="primary" aria-label="Thu hồi lời mời" :disabled="revokingInvitation" @click="revoke(item)" /></template></v-tooltip>
          </div></template>
        </v-data-table>
      </v-card>
    </template>

    <v-dialog :model-value="!!confirmation" :persistent="revokingInvitation" max-width="440" @update:model-value="value => { if (!value) confirmation = null }">
      <v-card title="Xác nhận thao tác"><v-card-text><p class="confirmation-message">{{ confirmation?.message }}</p></v-card-text><v-card-actions><v-spacer /><v-btn :disabled="revokingInvitation" @click="confirmation = null">Hủy</v-btn><v-btn color="primary" :loading="revokingInvitation" @click="confirmAction">Xác nhận</v-btn></v-card-actions></v-card>
    </v-dialog>
<v-dialog v-model="inviteDialog" max-width="560"><v-card class="dialog-card"><span class="eyebrow">LỜI MỜI MỚI</span><h2>Thêm người dùng</h2><p>Người nhận sẽ đặt mật khẩu qua liên kết được gửi trong email.</p><v-form class="dialog-form" @submit.prevent="sendInvite"><label>Trại</label><v-select :rules="[required('lựa chọn')]" v-model="farmId" :items="manageableFarms" item-title="name" item-value="id" hide-details="auto"/><label>Email</label><v-text-field :rules="[required('email'), emailRule]" v-model="email" type="email" placeholder="name@example.com" hide-details="auto" required/><label>Chức vụ</label><v-select v-model="role" :items="roleOptions" hide-details="auto"/><template v-if="needsArea"><div class="field-row"><label>Khu vực</label><v-btn variant="text" v-if="selectedFarm?.role === 'owner'" type="button" @click="areaDialog = true">+ Tạo khu vực</v-btn></div><v-select :rules="[required('lựa chọn')]" v-model="areaId" :items="areas" item-title="name" item-value="id" placeholder="Chọn khu vực" hide-details="auto" :disabled="selectedFarm?.role === 'area_manager'"/><small v-if="!areas.length" class="warning">Cần tạo khu vực trước khi mời chức vụ này.</small></template><div class="dialog-actions"><v-btn variant="text" @click="inviteDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="sending" :disabled="needsArea && !areaId">Gửi lời mời</v-btn></div></v-form></v-card></v-dialog>
<v-dialog v-model="editDialog" max-width="580"><v-card class="dialog-card"><span class="eyebrow">QUẢN LÝ TÀI KHOẢN</span><h2>Sửa người dùng</h2><p>Email không thể thay đổi.</p><v-form class="dialog-form" @submit.prevent="saveUser"><label>Họ và tên</label><v-text-field :rules="[required('họ tên'), maxLength(100)]" v-model="editForm.displayName" hide-details="auto" required/><label>Email</label><v-text-field v-model="editForm.email" disabled hide-details="auto"/><label>Số điện thoại</label><v-text-field :rules="[maxLength(30)]" v-model="editForm.phone" hide-details="auto"/><label>Chức vụ</label><v-select v-model="editForm.role" :items="roleOptions" :disabled="selectedFarm?.role !== 'owner' || editingUser?.id === auth.user?.id" hide-details="auto"/><template v-if="editNeedsArea"><label>Khu vực</label><v-select :rules="[required('lựa chọn')]" v-model="editForm.areaId" :items="areas" item-title="name" item-value="id" :disabled="selectedFarm?.role === 'area_manager'" hide-details="auto"/></template><label>Quyền truy cập tại trại này</label><v-select v-model="editForm.status" :items="[{ title: 'Đang hoạt động', value: 'active' }, { title: 'Ngừng hoạt động', value: 'suspended' }]" :disabled="editingUser?.id === auth.user?.id" hide-details="auto"/><div class="dialog-actions"><v-btn variant="text" @click="editDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="savingUser" :disabled="editNeedsArea && !editForm.areaId">Lưu thay đổi</v-btn></div></v-form></v-card></v-dialog>
<v-dialog v-model="areaDialog" max-width="500"><v-card class="dialog-card"><span class="eyebrow">PHẠM VI PHÂN QUYỀN</span><h2>Tạo khu vực</h2><v-form class="dialog-form" @submit.prevent="createArea"><label>Mã khu vực</label><v-text-field :rules="[codeRule]" v-model="newArea.code" @update:model-value="newArea.code = newArea.code.toUpperCase()" hide-details="auto" required/><label>Tên khu vực</label><v-text-field :rules="[required('tên'), maxLength(120)]" v-model="newArea.name" hide-details="auto" required/><div class="dialog-actions"><v-btn variant="text" @click="areaDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="creatingArea">Tạo khu vực</v-btn></div></v-form></v-card></v-dialog>

  </AppShell>
</template>

<style scoped>
h1,h2,p { margin-top: 0; }
h1 { margin-bottom: 8px; color: #134e4a; font-size: clamp(1.75rem,3vw,2.2rem); font-weight: 700; line-height: 1.3; letter-spacing: -.025em; }
h2 { margin-bottom: 7px; color: #134e4a; font-size: 1.25rem; }
.eyebrow { display: block; margin-bottom: 8px; color: #087f6e; font-size: 11px; font-weight: 700; letter-spacing: .08em; }
.page-header { display: flex; flex-direction: column; align-items: stretch; gap: 16px; margin-bottom: 26px; }
.page-header p,.list-header p,.dialog-card>p { margin-bottom: 0; color: #70817e; font-size: 13px; }
.page-actions { display: flex; justify-content: flex-end; gap: 10px; }
.page-title { display: flex; align-items: center; gap: 14px; }
.page-title h1 { margin: 0; }
.page-title-icon { border: 1px solid #dce7e4; }
.page-actions .v-btn { min-height: 40px; padding-inline: 18px; }
.farm-heading { display: flex; align-items: center; gap: 12px; min-width: 0; }
.farm-heading h2 { text-transform: uppercase; margin: 0; line-height: 1.45; overflow-wrap: anywhere; }
.farm-heading .eyebrow { margin-bottom: 3px; font-size: 10px; }
.list-header > .v-chip { flex-shrink: 0; }
.scope-cell { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
.scope-cell .v-icon { color: #70817e; }
.date-cell { color: #70817e; font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.users-card { padding: 24px; border: 1px solid #dce7e4; border-radius: 20px !important; }
.list-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-bottom: 22px; border-bottom: 1px solid #dce7e4; }
.first-farm-card { display: flex; align-items: center; gap: 18px; padding: 24px; border: 1px dashed #9bc7be; background: #f9fcfb; }
.first-farm-card p { margin: 0; color: #71827f; font-size: 12px; }
.dialog-card { padding: 30px; }
.table-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin: 20px 0; }
.invitation-toggle { flex: 0 0 auto; }
.member-search :deep(.v-field) { border-radius: 10px; }
.member-search { max-width: 360px; }
.table-toolbar :deep(.v-label) { font-size: 13px; opacity: 1; color: #48625e; }
.member-identity { display: flex; align-items: center; gap: 12px; padding: 16px 0; min-width: 230px; }
.member-copy { min-width: 0; }
.member-copy strong { display: block; color: #134e4a; font-size: 14px; font-weight: 600; }
.member-copy span { display: block; color: #70817e; font-size: 12px; margin-top: 3px; overflow-wrap: anywhere; }
.members-table { color: #48625e; }
.members-table :deep(.v-table__wrapper) { border-radius: 12px; }
.members-table :deep(th:first-child), .members-table :deep(td:first-child) { padding-left: 16px; }
.members-table :deep(th) { background: #f0fdfa; color: #48625e; font-size: 12px; font-weight: 600 !important; white-space: nowrap; }
.members-table :deep(td) { font-size: 13px; border-color: #dce7e4 !important; }
.members-table :deep(tbody tr:hover) { background: #f0fdfa; }
.members-table :deep(.v-chip) { font-size: 12px; font-weight: 500; white-space: nowrap; }
.members-table :deep(.v-data-table-footer) { padding-top: 16px; font-size: 12px; gap: 12px; color: #70817e; }
.confirmation-message { font-size: 15px; line-height: 1.7; color: #134e4a; margin: 0; }
.dialog-actions { padding-top: 16px; border-top: 1px solid #dce7e4; }
.dialog-form { display: grid; gap: 9px; margin-top: 23px; }
.dialog-form label { color: #48625e; font-size: 12px; font-weight: 700; }
.field-row { display: flex; justify-content: space-between; align-items: center; }
.warning { color: #a76b20; font-size: 12px; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 15px; }
.permission-empty { padding: 24px; border: 1px dashed #b9d6d0; border-radius: 15px; color: #647975; background: #f8fcfb; text-align: center; }
@media(max-width:760px) { .page-header,.first-farm-card { align-items: stretch; flex-direction: column; } .page-actions .v-btn { flex: 1; } .users-card { padding: 16px; } .table-toolbar { align-items: stretch; flex-direction: column; gap: 8px; } .member-search { max-width: none; } .list-header { gap: 12px; flex-wrap: wrap; } }
@media(max-width:460px) { .page-actions { flex-direction: column; } .dialog-card { padding: 22px; } }

h1,h2,p { margin-top: 0; }
h1 { margin-bottom: 8px; color: #134e4a; font-size: clamp(1.75rem,3vw,2.2rem); font-weight: 700; line-height: 1.3; letter-spacing: -.025em; }
h2 { margin-bottom: 7px; color: #134e4a; font-size: 1.25rem; }
.eyebrow { display: block; margin-bottom: 8px; color: #087f6e; font-size: 11px; font-weight: 700; letter-spacing: .08em; }
.page-header { display: flex; flex-direction: column; align-items: stretch; gap: 16px; margin-bottom: 26px; }
.page-header p,.list-header p,.dialog-card>p { margin-bottom: 0; color: #70817e; font-size: 13px; }
.page-actions { display: flex; justify-content: flex-end; gap: 10px; }
.page-title { display: flex; align-items: center; gap: 14px; }
.page-title h1 { margin: 0; }
.page-title-icon { border: 1px solid #dce7e4; }
.page-actions .v-btn { min-height: 40px; padding-inline: 18px; }
.farm-heading { display: flex; align-items: center; gap: 12px; min-width: 0; }
.farm-heading h2 { text-transform: uppercase; margin: 0; line-height: 1.45; overflow-wrap: anywhere; }
.farm-heading .eyebrow { margin-bottom: 3px; font-size: 10px; }
.list-header > .v-chip { flex-shrink: 0; }
.scope-cell { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
.scope-cell .v-icon { color: #70817e; }
.date-cell { color: #70817e; font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.users-card { padding: 24px; border: 1px solid #dce7e4; border-radius: 20px !important; }
.list-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-bottom: 22px; border-bottom: 1px solid #dce7e4; }
.first-farm-card { display: flex; align-items: center; gap: 18px; padding: 24px; border: 1px dashed #9bc7be; background: #f9fcfb; }
.first-farm-card p { margin: 0; color: #71827f; font-size: 12px; }
.dialog-card { padding: 30px; }
.table-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin: 20px 0; }
.invitation-toggle { flex: 0 0 auto; }
.member-search :deep(.v-field) { border-radius: 10px; }
.member-search { max-width: 360px; }
.table-toolbar :deep(.v-label) { font-size: 13px; opacity: 1; color: #48625e; }
.member-identity { display: flex; align-items: center; gap: 12px; padding: 16px 0; min-width: 230px; }
.member-copy { min-width: 0; }
.member-copy strong { display: block; color: #134e4a; font-size: 14px; font-weight: 600; }
.member-copy span { display: block; color: #70817e; font-size: 12px; margin-top: 3px; overflow-wrap: anywhere; }
.members-table { color: #48625e; }
.members-table :deep(.v-table__wrapper) { border-radius: 12px; }
.members-table :deep(th:first-child), .members-table :deep(td:first-child) { padding-left: 16px; }
.members-table :deep(th) { background: #f0fdfa; color: #48625e; font-size: 12px; font-weight: 600 !important; white-space: nowrap; }
.members-table :deep(td) { font-size: 13px; border-color: #dce7e4 !important; }
.members-table :deep(tbody tr:hover) { background: #f0fdfa; }
.members-table :deep(.v-chip) { font-size: 12px; font-weight: 500; white-space: nowrap; }
.members-table :deep(.v-data-table-footer) { padding-top: 16px; font-size: 12px; gap: 12px; color: #70817e; }
.confirmation-message { font-size: 15px; line-height: 1.7; color: #134e4a; margin: 0; }
.dialog-actions { padding-top: 16px; border-top: 1px solid #dce7e4; }
.dialog-form { display: grid; gap: 9px; margin-top: 23px; }
.dialog-form label { color: #48625e; font-size: 12px; font-weight: 700; }
.field-row { display: flex; justify-content: space-between; align-items: center; }
.warning { color: #a76b20; font-size: 12px; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 15px; }
.permission-empty { padding: 24px; border: 1px dashed #b9d6d0; border-radius: 15px; color: #647975; background: #f8fcfb; text-align: center; }
@media(max-width:760px) { .page-header,.first-farm-card { align-items: stretch; flex-direction: column; } .page-actions .v-btn { flex: 1; } .users-card { padding: 16px; } .table-toolbar { align-items: stretch; flex-direction: column; gap: 8px; } .member-search { max-width: none; } .list-header { gap: 12px; flex-wrap: wrap; } }
@media(max-width:460px) { .page-actions { flex-direction: column; } .dialog-card { padding: 22px; } }
</style>
