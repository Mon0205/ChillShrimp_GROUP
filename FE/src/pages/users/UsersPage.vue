<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { useAuth } from '../../composables/auth.js'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const auth = useAuth()
const farmContext = useFarmContext()
const farms = ref([]), manageableFarms = ref([]), invitations = ref([]), members = ref([]), areas = ref([])
const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const email = ref(''), role = ref('technician'), areaId = ref('')
const loading = ref(true), sending = ref(false), error = ref(''), success = ref('')
const inviteDialog = ref(false), createDialog = ref(false), creatingFarm = ref(false)
const editDialog = ref(false), savingUser = ref(false), editingUser = ref(null)
const editForm = ref({ displayName: '', email: '', phone: '', role: 'technician', areaId: '', status: 'active' })
const areaDialog = ref(false), creatingArea = ref(false)
const newFarm = ref({ code: '', name: '', address: '' }), newArea = ref({ code: '', name: '' })
const roleNames = { owner: 'Chủ trại', area_manager: 'Quản lý khu vực', technician: 'Nhân viên kỹ thuật', warehouse_staff: 'Nhân viên kho' }
const selectedFarm = computed(() => manageableFarms.value.find((farm) => farm.id === farmId.value))
const canCreateFarm = computed(() => farms.value.length === 0 || farms.value.some((farm) => farm.role === 'owner'))
const roleOptions = computed(() => selectedFarm.value?.role === 'owner' ? Object.entries(roleNames).map(([value, title]) => ({ title, value })) : [{ title: roleNames.technician, value: 'technician' }])
const needsArea = computed(() => ['area_manager', 'technician'].includes(role.value))
const userRows = computed(() => [...members.value.map((x) => ({ ...x, status: x.status || 'active' })), ...invitations.value.map((x) => ({ ...x, status: 'pending' }))])
const canEditUser = (item) => item.status !== 'pending' && (selectedFarm.value?.role === 'owner' || (selectedFarm.value?.role === 'area_manager' && item.role === 'technician' && item.area?.id === selectedFarm.value?.area?.id))
const editNeedsArea = computed(() => ['area_manager', 'technician'].includes(editForm.value.role))

async function loadFarms() {
  const [all, manageable] = await Promise.all([api('/farms'), api('/farms?manageable=true')])
  farms.value = all.data; manageableFarms.value = manageable.data
  farmContext.farms = all.data; farmContext.ready = true
  if (!manageableFarms.value.some((farm) => farm.id === farmId.value)) selectFarm(manageableFarms.value[0]?.id || '')
}
async function loadFarmData() {
  if (!farmId.value) { invitations.value = []; members.value = []; areas.value = []; return }
  const [invites, users, farmAreas] = await Promise.all([api(`/users/invitations?farmId=${encodeURIComponent(farmId.value)}`), api(`/users?farmId=${encodeURIComponent(farmId.value)}`), api(`/farms/${encodeURIComponent(farmId.value)}/areas`)])
  invitations.value = invites.data; members.value = users.data; areas.value = farmAreas.data
  if (!areas.value.some((area) => area.id === areaId.value)) areaId.value = areas.value[0]?.id || ''
}
onMounted(async () => { try { await loadFarms(); await loadFarmData() } catch (err) { error.value = err.message } finally { loading.value = false } })
watch(farmId, async () => { error.value = ''; role.value = 'technician'; try { await loadFarmData() } catch (err) { error.value = err.message } })
watch(error, (message) => { if (message) { showToast(message, 'error'); error.value = '' } })
watch(success, (message) => { if (message) { showToast(message, 'success'); success.value = '' } })

async function sendInvite() {
  error.value = ''; success.value = ''; sending.value = true
  try {
    await api('/users/invitations', { method: 'POST', body: JSON.stringify({ farmId: farmId.value, email: email.value, role: role.value, areaId: needsArea.value ? areaId.value : null }) })
    success.value = `Đã gửi lời mời đến ${email.value}.`; email.value = ''; inviteDialog.value = false; await loadFarmData()
  } catch (err) { error.value = err.message } finally { sending.value = false }
}
async function revoke(item) {
  if (!window.confirm(`Thu hồi lời mời đã gửi tới ${item.email}?`)) return
  try { await api(`/users/invitations/${item.id}`, { method: 'DELETE' }); showToast(`Đã thu hồi lời mời của ${item.email}.`); await loadFarmData() } catch (err) { error.value = err.message }
}
function openEdit(item) {
  editingUser.value = item
  editForm.value = { displayName: item.displayName || '', email: item.email, phone: item.phone || '', role: item.role, areaId: item.area?.id || '', status: item.status }
  error.value = ''; success.value = ''; editDialog.value = true
}
async function saveUser() {
  savingUser.value = true; error.value = ''; success.value = ''
  try {
    await api(`/users/${encodeURIComponent(editingUser.value.id)}`, { method: 'PATCH', body: JSON.stringify({ farmId: farmId.value, displayName: editForm.value.displayName, phone: editForm.value.phone, role: editForm.value.role, areaId: editNeedsArea.value ? editForm.value.areaId : null, status: editForm.value.status }) })
    success.value = `Đã cập nhật người dùng ${editForm.value.email}.`; editDialog.value = false; await loadFarmData()
  } catch (err) { error.value = err.message }
  finally { savingUser.value = false }
}
async function createArea() {
  const code = newArea.value.code.trim().toUpperCase(), name = newArea.value.name.trim()
  if (!code || !name) { error.value = 'Vui lòng nhập mã và tên khu vực.'; return }
  creatingArea.value = true
  try { const result = await api(`/farms/${encodeURIComponent(farmId.value)}/areas`, { method: 'POST', body: JSON.stringify({ code, name }) }); await loadFarmData(); areaId.value = result.data.id; newArea.value = { code: '', name: '' }; areaDialog.value = false } catch (err) { error.value = err.message } finally { creatingArea.value = false }
}
async function createFarm() {
  const code = newFarm.value.code.trim().toUpperCase(), name = newFarm.value.name.trim()
  if (!code || !name) { error.value = 'Vui lòng nhập mã và tên trại.'; return }
  creatingFarm.value = true
  try { const result = await api('/farms', { method: 'POST', body: JSON.stringify({ code, name, address: newFarm.value.address }) }); await loadFarms(); farmId.value = result.data.id; newFarm.value = { code: '', name: '', address: '' }; createDialog.value = false; success.value = 'Đã tạo trại mới.' } catch (err) { error.value = err.message } finally { creatingFarm.value = false }
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
      <div><span class="eyebrow">NHÂN SỰ & PHÂN QUYỀN</span><h1>Người dùng</h1><p>Quản lý người dùng và quyền truy cập theo từng trại.</p></div>
      <div class="page-actions"><v-btn v-if="canCreateFarm" color="primary" variant="outlined" @click="createDialog = true">Tạo trại</v-btn><v-btn v-if="manageableFarms.length" color="primary" @click="inviteDialog = true">Thêm người dùng</v-btn></div>
    </header>
    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />
    <template v-else>
      <v-card v-if="!manageableFarms.length && canCreateFarm" class="first-farm-card" elevation="0"><div class="first-farm-icon">+</div><div><h2>Tạo trại đầu tiên</h2><p>Bạn cần tạo trại trước khi thêm người dùng.</p></div><v-btn color="primary" @click="createDialog = true">Tạo trại ngay</v-btn></v-card>
      <div v-else-if="!manageableFarms.length" class="permission-empty">Chức vụ hiện tại không có quyền quản lý người dùng.</div>
      <v-card v-else class="users-card" elevation="0">
        <div class="list-header"><div><span class="eyebrow">DANH SÁCH TẬP TRUNG</span><h2>Người dùng của {{ selectedFarm?.name }}</h2><p>Gồm người đã tham gia và lời mời đang chờ xác nhận.</p></div><span class="count-badge">{{ userRows.length }}</span></div>
        <div v-if="!userRows.length" class="empty-state"><div>0</div><strong>Chưa có người dùng</strong><p>Nhấn “Thêm người dùng” để gửi lời mời đầu tiên.</p></div>
        <div v-else class="table-wrap"><table><thead><tr><th>Người dùng</th><th>Chức vụ</th><th>Phạm vi</th><th>Trạng thái</th><th>Ngày tham gia</th><th></th></tr></thead><tbody>
          <tr v-for="item in userRows" :key="`${item.status}-${item.id}`" :class="{ pending: item.status === 'pending' }">
            <td><div class="identity"><span>{{ (item.displayName || item.email).slice(0, 1).toUpperCase() }}</span><div><strong>{{ item.displayName || (item.status === 'pending' ? 'Chưa xác nhận' : 'Chưa cập nhật tên') }}</strong><small>{{ item.email }}</small></div></div></td>
            <td><span class="role-tag">{{ roleNames[item.role] }}</span></td><td>{{ item.area?.name || 'Toàn trại' }}</td>
            <td><span class="status-tag" :class="item.status">{{ item.status === 'active' ? 'Đang hoạt động' : item.status === 'suspended' ? 'Ngưng sử dụng' : 'Chờ xác nhận' }}</span></td>
            <td>{{ item.status === 'pending' ? 'Chưa tham gia' : formatDate(item.createdAt) }}</td>
            <td><div class="row-actions"><button v-if="item.status === 'pending'" class="revoke-btn" type="button" title="Thu hồi lời mời" @click="revoke(item)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button><button v-else-if="canEditUser(item)" class="edit-btn" type="button" title="Sửa người dùng" @click="openEdit(item)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button></div></td>
          </tr>
        </tbody></table></div>
      </v-card>
    </template>

    <v-dialog v-model="inviteDialog" max-width="560"><v-card class="dialog-card"><span class="eyebrow">LỜI MỜI MỚI</span><h2>Thêm người dùng</h2><p>Người nhận sẽ đặt mật khẩu qua liên kết được gửi trong email.</p><v-form class="dialog-form" @submit.prevent="sendInvite"><label>Trại</label><v-select v-model="farmId" :items="manageableFarms" item-title="name" item-value="id" hide-details="auto"/><label>Email</label><v-text-field v-model="email" type="email" placeholder="name@example.com" hide-details="auto" required/><label>Chức vụ</label><v-select v-model="role" :items="roleOptions" hide-details="auto"/><template v-if="needsArea"><div class="field-row"><label>Khu vực</label><button v-if="selectedFarm?.role === 'owner'" type="button" @click="areaDialog = true">+ Tạo khu vực</button></div><v-select v-model="areaId" :items="areas" item-title="name" item-value="id" placeholder="Chọn khu vực" hide-details="auto" :disabled="selectedFarm?.role === 'area_manager'"/><small v-if="!areas.length" class="warning">Cần tạo khu vực trước khi mời chức vụ này.</small></template><div class="dialog-actions"><v-btn variant="text" @click="inviteDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="sending" :disabled="needsArea && !areaId">Gửi lời mời</v-btn></div></v-form></v-card></v-dialog>
    <v-dialog v-model="editDialog" max-width="580"><v-card class="dialog-card"><span class="eyebrow">QUẢN LÝ TÀI KHOẢN</span><h2>Sửa người dùng</h2><p>Email không thể thay đổi.</p><v-form class="dialog-form" @submit.prevent="saveUser"><label>Họ và tên</label><v-text-field v-model="editForm.displayName" hide-details="auto" required/><label>Email</label><v-text-field v-model="editForm.email" disabled hide-details="auto"/><label>Số điện thoại</label><v-text-field v-model="editForm.phone" hide-details="auto"/><label>Chức vụ</label><v-select v-model="editForm.role" :items="roleOptions" :disabled="selectedFarm?.role !== 'owner' || editingUser?.id === auth.user?.id" hide-details="auto"/><template v-if="editNeedsArea"><label>Khu vực</label><v-select v-model="editForm.areaId" :items="areas" item-title="name" item-value="id" :disabled="selectedFarm?.role === 'area_manager'" hide-details="auto"/></template><label>Trạng thái sử dụng</label><v-select v-model="editForm.status" :items="[{ title: 'Đang hoạt động', value: 'active' }, { title: 'Ngưng sử dụng', value: 'suspended' }]" :disabled="editingUser?.id === auth.user?.id" hide-details="auto"/><div class="dialog-actions"><v-btn variant="text" @click="editDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="savingUser" :disabled="editNeedsArea && !editForm.areaId">Lưu thay đổi</v-btn></div></v-form></v-card></v-dialog>
    <v-dialog v-model="createDialog" max-width="520"><v-card class="dialog-card"><span class="eyebrow">THIẾT LẬP TRẠI</span><h2>Tạo trại mới</h2><v-form class="dialog-form" @submit.prevent="createFarm"><label>Mã trại</label><v-text-field v-model="newFarm.code" placeholder="Ví dụ: CT001" @update:model-value="newFarm.code = newFarm.code.toUpperCase()" required/><label>Tên trại</label><v-text-field v-model="newFarm.name" hide-details="auto" required/><label>Địa chỉ <small>(không bắt buộc)</small></label><v-text-field v-model="newFarm.address" hide-details="auto"/><div class="dialog-actions"><v-btn variant="text" @click="createDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="creatingFarm">Tạo trại</v-btn></div></v-form></v-card></v-dialog>
    <v-dialog v-model="areaDialog" max-width="500"><v-card class="dialog-card"><span class="eyebrow">PHẠM VI PHÂN QUYỀN</span><h2>Tạo khu vực</h2><v-form class="dialog-form" @submit.prevent="createArea"><label>Mã khu vực</label><v-text-field v-model="newArea.code" @update:model-value="newArea.code = newArea.code.toUpperCase()" hide-details="auto" required/><label>Tên khu vực</label><v-text-field v-model="newArea.name" hide-details="auto" required/><div class="dialog-actions"><v-btn variant="text" @click="areaDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="creatingArea">Tạo khu vực</v-btn></div></v-form></v-card></v-dialog>
  </AppShell>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:clamp(1.85rem,3vw,2.55rem);letter-spacing:-.045em}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.13em}.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:26px}.page-header p,.list-header p,.dialog-card>p{margin-bottom:0;color:#70817e;font-size:13px}.page-actions{display:flex;gap:10px;flex:0 0 auto}.notice{margin-bottom:18px}.toolbar-card{display:flex;align-items:end;justify-content:space-between;gap:25px;padding:18px 22px;margin-bottom:20px;border:1px solid #dce7e4;border-radius:16px;background:white}.farm-filter{width:min(100%,340px)}.toolbar-card label,.dialog-form label{display:block;margin-bottom:6px;color:#48625e;font-size:11px;font-weight:700}.metrics{display:flex;gap:26px;color:#74837f;font-size:11px}.metrics span{display:grid;text-align:center}.metrics strong{color:#087f6e;font-size:20px}.users-card{padding:26px;border:1px solid #dce7e4!important;border-radius:18px!important}.list-header{display:flex;justify-content:space-between;gap:20px;padding-bottom:20px;border-bottom:1px solid #e5ecea}.count-badge{min-width:34px;height:30px;display:grid;place-items:center;border-radius:9px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th{padding:14px 10px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}td{padding:15px 10px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:10px;white-space:nowrap}tr:last-child td{border-bottom:0}tr.pending{background:#fffdfa}.identity{min-width:210px;display:flex;align-items:center;gap:10px}.identity>span{width:36px;height:36px;display:grid;place-items:center;border-radius:10px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.identity strong,.identity small{display:block;max-width:210px;overflow:hidden;text-overflow:ellipsis}.identity strong{color:#294c47;font-size:11px}.identity small{margin-top:3px;color:#83918e;font-size:9px}.role-tag,.status-tag{padding:4px 8px;border-radius:7px;font-size:9px;font-weight:700}.role-tag,.status-tag.active{color:#087f6e;background:#e7f4f1}.status-tag.pending{color:#9a6519;background:#fff1d9}.revoke-btn{width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:9px;color:#b94a48;background:#fff0ef;cursor:pointer}.revoke-btn:hover{background:#ffe1df}.revoke-btn svg{width:18px;height:18px}.empty-state{min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#70817e;text-align:center}.empty-state>div{width:44px;height:44px;display:grid;place-items:center;margin-bottom:12px;border-radius:13px;color:#087f6e;background:#e7f4f1;font-weight:800}.empty-state strong{color:#365751;font-size:12px}.empty-state p{margin:5px 0 0;font-size:10px}.first-farm-card{display:grid;grid-template-columns:54px 1fr auto;align-items:center;gap:18px;padding:24px;border:1px dashed #9bc7be!important;background:#f9fcfb!important}.first-farm-card p{margin:0;color:#71827f;font-size:12px}.first-farm-icon{width:52px;height:52px;display:grid;place-items:center;border-radius:15px;color:#087f6e;background:#e2f3ef;font-size:25px}.dialog-card{padding:30px;border-radius:20px!important}.dialog-form{display:grid;gap:9px;margin-top:23px}.field-row{display:flex;justify-content:space-between;align-items:center}.field-row label{margin:0}.field-row button{border:0;color:#087f6e;background:transparent;font:700 10px Manrope,sans-serif;cursor:pointer}.warning{color:#a76b20;font-size:10px}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}
@media(max-width:760px){.page-header,.toolbar-card{align-items:stretch;flex-direction:column}.page-actions .v-btn{flex:1}.metrics{justify-content:space-around}.first-farm-card{grid-template-columns:48px 1fr}.first-farm-card>.v-btn{grid-column:1/-1}.users-card{padding:20px}}@media(max-width:460px){.page-actions{flex-direction:column}.dialog-card{padding:22px}}
.status-tag.suspended{color:#ad4141;background:#ffebea}.row-actions{display:flex;justify-content:flex-end}.status-btn{width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:9px;cursor:pointer}.status-btn svg{width:18px;height:18px}.status-btn.active{color:#b94a48;background:#fff0ef}.status-btn.active:hover{background:#ffe1df}.status-btn.suspended{color:#087f6e;background:#e7f4f1}.status-btn.suspended:hover{background:#d6eee8}
.edit-btn{width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:9px;color:#087f6e;background:#e7f4f1;cursor:pointer}.edit-btn:hover{background:#d6eee8}.edit-btn svg{width:17px;height:17px}
.permission-empty{padding:24px;border:1px dashed #b9d6d0;border-radius:15px;color:#647975;background:#f8fcfb;font-size:12px;text-align:center}
</style>
