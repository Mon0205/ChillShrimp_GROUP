<script setup>
import AppShell from '../../components/shell/index.vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const farms = ref([])
const areas = ref([])
const tanks = ref([])
const loading = ref(true)
const tanksLoading = ref(false)
const error = ref('')
const farmDialog = ref(false)
const saving = ref(false)
const tankFormRef = ref(null)
const codeApiError = ref('')
const editing = ref(false)
const editingTank = ref(null)
const form = ref({ code: '', name: '', areaId: '', tankType: 'nursery_tank', volumeM3: '', description: '' })
const search = ref('')
const statusFilter = ref('')
const typeFilter = ref('')

const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const selectedRole = computed(() => selectedFarm.value?.role || '')
const canManage = computed(() => ['owner', 'area_manager'].includes(selectedRole.value))
const isAreaManager = computed(() => selectedRole.value === 'area_manager')
const roleNames = { owner: 'Chủ trại', area_manager: 'Quản lý khu vực', technician: 'Nhân viên kỹ thuật', warehouse_staff: 'Nhân viên kho' }
const typeOptions = [
  { title: 'Bể ương', value: 'nursery_tank' },
  { title: 'Ao', value: 'pond' },
  { title: 'Khác', value: 'other' },
]
const statusOptions = [
  { title: 'Trống', value: 'empty' },
  { title: 'Đang ương', value: 'active' },
  { title: 'Đang vệ sinh', value: 'cleaning' },
  { title: 'Ngừng sử dụng', value: 'inactive' },
]
const statusNames = Object.fromEntries(statusOptions.map((item) => [item.value, item.title]))
const typeNames = Object.fromEntries(typeOptions.map((item) => [item.value, item.title]))
const areaOptions = computed(() => areas.value.map((area) => ({ title: `${area.code} · ${area.name}`, value: area.id })))
const areaRequired = computed(() => isAreaManager.value)
const validTankTypes = typeOptions.map((item) => item.value)
const requiredRule = (label) => (value) => String(value ?? '').trim().length > 0 || `${label} là bắt buộc.`
const codeRules = [
  requiredRule('Mã ao/bể'),
  (value) => String(value ?? '').trim().length >= 2 || 'Mã ao/bể phải có ít nhất 2 ký tự.',
  (value) => String(value ?? '').trim().length <= 50 || 'Mã ao/bể không được vượt quá 50 ký tự.',
  (value) => /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(String(value ?? '').trim()) || 'Mã chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.',
]
const nameRules = [
  requiredRule('Tên ao/bể'),
  (value) => String(value ?? '').trim().length <= 100 || 'Tên ao/bể không được vượt quá 100 ký tự.',
]
const typeRules = [
  requiredRule('Loại ao/bể'),
  (value) => validTankTypes.includes(value) || 'Loại ao/bể không hợp lệ.',
]
const volumeRules = [
  requiredRule('Thể tích'),
  (value) => Number.isFinite(Number(value)) || 'Thể tích phải là một số hợp lệ.',
  (value) => Number(value) > 0 || 'Thể tích phải lớn hơn 0 m³.',
  (value) => Number(value) <= 1000000 || 'Thể tích không được vượt quá 1.000.000 m³.',
]
const areaRules = computed(() => areaRequired.value ? [requiredRule('Khu vực')] : [])
const descriptionRules = [
  (value) => String(value ?? '').length <= 2000 || 'Mô tả không được vượt quá 2.000 ký tự.',
]

function queryString() {
  const params = new URLSearchParams()
  if (search.value.trim()) params.set('q', search.value.trim())
  if (statusFilter.value) params.set('status', statusFilter.value)
  if (typeFilter.value) params.set('tankType', typeFilter.value)
  return params.toString()
}

async function loadFarms() {
  const result = await api('/farms')
  farms.value = result.data
  farmContext.farms = result.data
  farmContext.ready = true
  if (!farms.value.some((farm) => farm.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
}

async function loadAreas() {
  areas.value = []
  if (!farmId.value || !canManage.value) return
  areas.value = (await api(`/farms/${encodeURIComponent(farmId.value)}/areas`)).data
}

async function loadTanks() {
  if (!farmId.value) { tanks.value = []; return }
  tanksLoading.value = true
  try {
    const query = queryString()
    const result = await api(`/farms/${encodeURIComponent(farmId.value)}/ponds-tanks${query ? `?${query}` : ''}`)
    tanks.value = result.data
  } catch (err) {
    tanks.value = []
    error.value = err.message
  } finally { tanksLoading.value = false }
}

async function loadPage() {
  loading.value = true
  error.value = ''
  try { await loadFarms(); await Promise.all([loadAreas(), loadTanks()]) }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
  finally { loading.value = false }
}

function resetForm() {
  form.value = { code: '', name: '', areaId: isAreaManager.value ? selectedFarm.value?.area?.id || '' : '', tankType: 'nursery_tank', volumeM3: '', description: '' }
}

async function openCreate() {
  editing.value = false
  editingTank.value = null
  codeApiError.value = ''
  resetForm()
  farmDialog.value = true
  await nextTick()
  tankFormRef.value?.resetValidation()
}

async function openEdit(tank) {
  editing.value = true
  editingTank.value = tank
  codeApiError.value = ''
  form.value = { code: tank.code, name: tank.name, areaId: tank.area?.id || '', tankType: tank.tankType, volumeM3: tank.volumeM3, description: tank.description || '', status: tank.status }
  farmDialog.value = true
  await nextTick()
  tankFormRef.value?.resetValidation()
}

async function saveTank() {
  const validation = await tankFormRef.value?.validate()
  if (!validation?.valid) {
    showToast('Vui lòng kiểm tra lại các trường chưa hợp lệ.', 'error')
    return
  }
  const payload = { ...form.value, code: form.value.code.trim().toUpperCase(), name: form.value.name.trim(), volumeM3: form.value.volumeM3 === '' ? '' : Number(form.value.volumeM3), areaId: form.value.areaId || null }
  saving.value = true
  try {
    const path = editing.value ? `/farms/${encodeURIComponent(farmId.value)}/ponds-tanks/${encodeURIComponent(editingTank.value.id)}` : `/farms/${encodeURIComponent(farmId.value)}/ponds-tanks`
    await api(path, { method: editing.value ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
    farmDialog.value = false
    showToast(editing.value ? 'Đã cập nhật ao/bể.' : 'Đã tạo ao/bể.', 'success')
    await loadTanks()
  } catch (err) {
    if (err.status === 409 && err.message.toLowerCase().includes('mã ao/bể')) codeApiError.value = err.message
    showToast(err.message, 'error')
  }
  finally { saving.value = false }
}

function formatVolume(value) {
  return `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} m³`
}

watch(farmId, async () => {
  error.value = ''
  await Promise.all([loadAreas(), loadTanks()])
})
watch(() => form.value.code, () => { codeApiError.value = '' })
watch([search, statusFilter, typeFilter], loadTanks)
onMounted(loadPage)
</script>

<template>
<AppShell>
    <header class="page-header">
      <div>
        <span class="eyebrow">SẢN XUẤT</span>
        <h1>Ao/bể</h1>
        <p>Quản lý nơi ương giống theo từng trang trại và khu vực được phân quyền.</p>
      </div>
      <v-btn v-if="canManage && selectedFarm" color="primary" @click="openCreate">Thêm ao/bể</v-btn>
    </header>

    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />
    <div v-else-if="error" class="notice error-notice">{{ error }}</div>
    <template v-else-if="!farms.length">
      <v-card class="empty-card" elevation="0"><div class="empty-icon">+</div><h2>Chưa có trang trại</h2><p>Tạo hoặc tham gia trang trại trước khi quản lý ao/bể.</p><v-btn to="/farms" color="primary">Mở quản lý trang trại</v-btn></v-card>
    </template>
    <template v-else>
      <v-card class="toolbar-card" elevation="0">
        <div class="toolbar-field farm-field"><label>Trang trại</label><v-select v-model="farmId" :items="farms" item-title="name" item-value="id" hide-details /></div>
        <div class="toolbar-field"><label>Tìm kiếm</label><v-text-field v-model="search" placeholder="Mã hoặc tên ao/bể" hide-details clearable /></div>
        <div class="toolbar-field"><label>Trạng thái</label><v-select v-model="statusFilter" :items="[{ title: 'Tất cả', value: '' }, ...statusOptions]" hide-details /></div>
        <div class="toolbar-field"><label>Loại</label><v-select v-model="typeFilter" :items="[{ title: 'Tất cả', value: '' }, ...typeOptions]" hide-details /></div>
      </v-card>

      <v-card class="list-card" elevation="0">
        <div class="list-heading"><div><span class="eyebrow">DANH SÁCH AO/BỂ</span><h2>{{ selectedFarm?.name }}</h2><p>{{ tanks.length }} ao/bể trong phạm vi hiện tại · {{ roleNames[selectedRole] }}</p></div><span class="count-badge">{{ tanks.length }}</span></div>
        <v-progress-linear v-if="tanksLoading" indeterminate color="primary" rounded />
        <div v-else-if="!tanks.length" class="empty-state"><div>0</div><strong>Chưa có ao/bể phù hợp</strong><p>Thêm ao/bể mới hoặc điều chỉnh bộ lọc.</p></div>
        <div v-else class="table-wrap">
          <table class="app-data-table"><thead><tr><th>Mã</th><th>Ao/bể</th><th>Khu vực</th><th>Loại</th><th>Thể tích</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody><tr v-for="tank in tanks" :key="tank.id" :class="{ 'deleted-row': tank.deletedAt }"><td><strong class="tank-code">{{ tank.code }}</strong></td><td><strong>{{ tank.name }}</strong><small>{{ tank.description || 'Chưa có mô tả' }}</small></td><td>{{ tank.area?.name || 'Toàn trại' }}</td><td>{{ typeNames[tank.tankType] }}</td><td>{{ formatVolume(tank.volumeM3) }}</td><td><span v-if="tank.deletedAt" class="status-tag deleted">Đã xóa</span><span v-else class="status-tag" :class="tank.status">{{ statusNames[tank.status] }}</span></td><td><div v-if="canManage" class="row-actions"><button class="icon-btn" type="button" title="Chỉnh sửa" @click="openEdit(tank)">✎</button></div></td></tr></tbody>
          </table>
        </div>
      </v-card>
    </template>

    <v-dialog v-model="farmDialog" max-width="560">
      <v-card class="dialog-card">
        <span class="eyebrow">{{ editing ? 'CẬP NHẬT AO/BỂ' : 'AO/BỂ MỚI' }}</span>
        <h2>{{ editing ? 'Chỉnh sửa thông tin' : 'Thêm ao/bể' }}</h2>
        <v-form ref="tankFormRef" class="dialog-form" validate-on="blur" @submit.prevent="saveTank">
          <div class="field-grid">
            <div>
              <label>Mã ao/bể</label>
              <v-text-field
                v-model="form.code"
                placeholder="B01"
                maxlength="50"
                counter="50"
                :rules="codeRules"
                :error-messages="codeApiError"
                autocomplete="off"
                hide-details="auto"
                @update:model-value="form.code = String(form.code || '').toUpperCase()"
              />
            </div>
            <div>
              <label>Tên ao/bể</label>
              <v-text-field
                v-model="form.name"
                placeholder="Bể ương số 01"
                maxlength="100"
                counter="100"
                :rules="nameRules"
                hide-details="auto"
              />
            </div>
          </div>
          <div class="field-grid">
            <div>
              <label>Loại</label>
              <v-select v-model="form.tankType" :items="typeOptions" :rules="typeRules" hide-details="auto" />
            </div>
            <div>
              <label>Thể tích (m³)</label>
              <v-text-field
                v-model="form.volumeM3"
                type="number"
                min="0.001"
                max="1000000"
                step="0.001"
                :rules="volumeRules"
                hide-details="auto"
              />
            </div>
          </div>
          <label>Khu vực</label>
          <v-select
            v-model="form.areaId"
            :items="areaOptions"
            :rules="areaRules"
            clearable
            :disabled="isAreaManager"
            :placeholder="areaRequired ? 'Chọn khu vực' : 'Không bắt buộc'"
            hide-details="auto"
          />
          <template v-if="editing">
            <label>Trạng thái</label>
            <v-select v-model="form.status" :items="statusOptions" hide-details="auto" />
          </template>
          <label>Mô tả</label>
          <v-textarea
            v-model="form.description"
            rows="3"
            auto-grow
            maxlength="2000"
            counter="2000"
            :rules="descriptionRules"
            hide-details="auto"
          />
          <div class="dialog-actions">
            <v-btn variant="text" @click="farmDialog = false">Hủy</v-btn>
            <v-btn type="submit" color="primary" :loading="saving">{{ editing ? 'Lưu thay đổi' : 'Tạo ao/bể' }}</v-btn>
          </div>
        </v-form>
      </v-card>
    </v-dialog>
  </AppShell>
</template>

<style scoped>
*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:clamp(1.85rem,3vw,2.55rem)}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.13em}.danger-text{color:#b42318}.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:26px}.page-header p,.list-heading p{margin-bottom:0;color:#70817e;font-size:13px}.toolbar-card{display:grid;grid-template-columns:1.25fr 1.5fr 1fr 1fr;gap:14px;padding:18px 22px;margin-bottom:20px;border:1px solid #dce7e4;border-radius:16px;background:white}.toolbar-field{min-width:0}.toolbar-field label,.dialog-form label{display:block;margin-bottom:6px;color:#48625e;font-size:11px;font-weight:700}.deleted-toggle :deep(.v-switch){height:40px}.list-card{padding:26px;border:1px solid #dce7e4!important;border-radius:18px!important}.list-heading{display:flex;justify-content:space-between;gap:20px;padding-bottom:20px;border-bottom:1px solid #e5ecea}.count-badge{min-width:34px;height:30px;display:grid;place-items:center;border-radius:9px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th{padding:14px 10px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}td{padding:15px 10px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;white-space:nowrap}td strong,td small{display:block}td strong{color:#294c47;font-size:11px}td small{max-width:220px;margin-top:4px;overflow:hidden;color:#83918e;text-overflow:ellipsis;font-size:9px}.deleted-row{background:#fafafa;opacity:.78}.tank-code{color:#087f6e!important}.status-tag{display:inline-block;padding:5px 8px;border-radius:7px;font-size:9px;font-weight:700}.status-tag.empty{color:#087f6e;background:#e7f4f1}.status-tag.active{color:#1e6d9b;background:#e7f2fb}.status-tag.cleaning{color:#9a6519;background:#fff1d9}.status-tag.inactive,.status-tag.deleted{color:#7b8583;background:#eef1f0}.row-actions{display:flex;justify-content:flex-end;gap:5px}.icon-btn{width:30px;height:30px;border:0;border-radius:8px;color:#087f6e;background:#e7f4f1;font-size:17px;line-height:1;cursor:pointer}.icon-btn:hover{background:#d6eee8}.icon-btn.danger{color:#b94a48;background:#fff0ef}.icon-btn.danger:hover{background:#ffe1df}.empty-state,.empty-card{color:#70817e;text-align:center}.empty-state{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center}.empty-state>div,.empty-icon{width:44px;height:44px;display:grid;place-items:center;margin-bottom:12px;border-radius:13px;color:#087f6e;background:#e7f4f1;font-weight:800}.empty-state strong,.empty-card h2{color:#365751;font-size:12px}.empty-state p,.empty-card p{margin:5px 0 0;font-size:10px}.empty-card{padding:46px;border:1px solid #dce7e4!important;border-radius:18px!important;background:white!important}.empty-card .empty-icon{margin:0 auto 14px;font-size:25px}.empty-card p{margin:8px 0 20px;font-size:13px}.notice{padding:16px;border-radius:12px;font-size:13px}.error-notice{color:#9b3e3e;background:#fff0ef}.dialog-card{padding:30px;border-radius:20px!important}.dialog-copy{margin:14px 0 0;color:#667085;font-size:12px;line-height:1.7}.dialog-form{display:grid;gap:9px;margin-top:23px}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}@media(max-width:1050px){.toolbar-card{grid-template-columns:1fr 1fr}}@media(max-width:650px){.page-header{align-items:stretch;flex-direction:column}.toolbar-card,.field-grid{grid-template-columns:1fr}.list-card{padding:20px}.dialog-card{padding:22px}}
.list-heading { border-bottom: 0; }
.table-wrap { margin-top: 20px; }

*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:clamp(1.85rem,3vw,2.55rem)}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.13em}.danger-text{color:#b42318}.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:26px}.page-header p,.list-heading p{margin-bottom:0;color:#70817e;font-size:13px}.toolbar-card{display:grid;grid-template-columns:1.25fr 1.5fr 1fr 1fr;gap:14px;padding:18px 22px;margin-bottom:20px;border:1px solid #dce7e4;border-radius:16px;background:white}.toolbar-field{min-width:0}.toolbar-field label,.dialog-form label{display:block;margin-bottom:6px;color:#48625e;font-size:11px;font-weight:700}.deleted-toggle :deep(.v-switch){height:40px}.list-card{padding:26px;border:1px solid #dce7e4!important;border-radius:18px!important}.list-heading{display:flex;justify-content:space-between;gap:20px;padding-bottom:20px;border-bottom:1px solid #e5ecea}.count-badge{min-width:34px;height:30px;display:grid;place-items:center;border-radius:9px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th{padding:14px 10px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}td{padding:15px 10px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;white-space:nowrap}td strong,td small{display:block}td strong{color:#294c47;font-size:11px}td small{max-width:220px;margin-top:4px;overflow:hidden;color:#83918e;text-overflow:ellipsis;font-size:9px}.deleted-row{background:#fafafa;opacity:.78}.tank-code{color:#087f6e!important}.status-tag{display:inline-block;padding:5px 8px;border-radius:7px;font-size:9px;font-weight:700}.status-tag.empty{color:#087f6e;background:#e7f4f1}.status-tag.active{color:#1e6d9b;background:#e7f2fb}.status-tag.cleaning{color:#9a6519;background:#fff1d9}.status-tag.inactive,.status-tag.deleted{color:#7b8583;background:#eef1f0}.row-actions{display:flex;justify-content:flex-end;gap:5px}.icon-btn{width:30px;height:30px;border:0;border-radius:8px;color:#087f6e;background:#e7f4f1;font-size:17px;line-height:1;cursor:pointer}.icon-btn:hover{background:#d6eee8}.icon-btn.danger{color:#b94a48;background:#fff0ef}.icon-btn.danger:hover{background:#ffe1df}.empty-state,.empty-card{color:#70817e;text-align:center}.empty-state{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center}.empty-state>div,.empty-icon{width:44px;height:44px;display:grid;place-items:center;margin-bottom:12px;border-radius:13px;color:#087f6e;background:#e7f4f1;font-weight:800}.empty-state strong,.empty-card h2{color:#365751;font-size:12px}.empty-state p,.empty-card p{margin:5px 0 0;font-size:10px}.empty-card{padding:46px;border:1px solid #dce7e4!important;border-radius:18px!important;background:white!important}.empty-card .empty-icon{margin:0 auto 14px;font-size:25px}.empty-card p{margin:8px 0 20px;font-size:13px}.notice{padding:16px;border-radius:12px;font-size:13px}.error-notice{color:#9b3e3e;background:#fff0ef}.dialog-card{padding:30px;border-radius:20px!important}.dialog-copy{margin:14px 0 0;color:#667085;font-size:12px;line-height:1.7}.dialog-form{display:grid;gap:9px;margin-top:23px}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}@media(max-width:1050px){.toolbar-card{grid-template-columns:1fr 1fr}}@media(max-width:650px){.page-header{align-items:stretch;flex-direction:column}.toolbar-card,.field-grid{grid-template-columns:1fr}.list-card{padding:20px}.dialog-card{padding:22px}}
.list-heading { border-bottom: 0; }
.table-wrap { margin-top: 20px; }
</style>
