<script setup>
import { singleFlight } from '../../utils/single-flight.js'
import LocalPages from '../../components/pagination/LocalPages.vue'
import tankIllustration from '../../assets/ponds/tank-photo.png'
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
const technicians = ref([])
const techniciansLoading = ref(false)
const technicianError = ref('')
let technicianRequest = 0
const form = ref({ code: '', name: '', areaId: '', responsibleUserId: '', tankType: '', volumeM3: '', description: '' })
const search = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const areaFilter = ref('')
const selectedTankId = ref('')
const viewMode = ref('map')
const statusCounts = computed(() => ({ total: tanks.value.length, active: tanks.value.filter(t => t.status === 'active').length, cleaning: tanks.value.filter(t => t.status === 'cleaning').length, empty: tanks.value.filter(t => t.status === 'empty').length }))
const tankGroups = computed(() => {
  const groups = new Map()
  for (const tank of tanks.value) {
    const key = tank.area?.id || tank.areaId || 'unassigned'
    if (!groups.has(key)) groups.set(key, { key, name: tank.area?.name || 'Toàn trại', tanks: [] })
    groups.get(key).tanks.push(tank)
  }
  return [...groups.values()]
})
const visibleGroups = computed(() => tankGroups.value.filter(group => !areaFilter.value || group.key === areaFilter.value))
const visibleTanks = computed(() => visibleGroups.value.flatMap(group => group.tanks))
const selectedTank = computed(() => visibleTanks.value.find(tank => tank.id === selectedTankId.value) || visibleTanks.value[0])

const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const selectedRole = computed(() => selectedFarm.value?.role || '')
const canManage = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER'].includes(selectedRole.value))
const isAreaManager = computed(() => selectedRole.value === 'AREA_MANAGER')
const roleNames = { OWNER: 'Chủ trại', FARM_MANAGER: 'Quản lý trại', AREA_MANAGER: 'Quản lý khu vực', TECHNICIAN: 'Kỹ thuật viên', WAREHOUSE_STAFF: 'Nhân viên kho' }
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
const technicianOptions = computed(() => {
  const options = technicians.value.map(user => ({ title: user.displayName || '', value: user.id }))
  const current = editingTank.value?.responsibleUser
  if (editing.value && current && form.value.areaId === editingTank.value.areaId && !options.some(option => option.value === current.id)) {
    options.unshift({ title: current.displayName || '', value: current.id })
  }
  return options
})
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
const areaRules = [requiredRule('Khu vực')]
const descriptionRules = [
  (value) => String(value ?? '').length <= 2000 || 'Mô tả không được vượt quá 2.000 ký tự.',
]

function queryString() {
  const params = new URLSearchParams()
  if (search.value?.trim()) params.set('q', search.value.trim())
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
  error.value = ''
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
  form.value = { code: '', name: '', areaId: '', responsibleUserId: '', tankType: '', volumeM3: '', description: '' }
}

async function loadTechnicians() {
  const requestId = ++technicianRequest
  technicians.value = []
  technicianError.value = ''
  techniciansLoading.value = false
  if (!farmId.value || !form.value.areaId) return
  techniciansLoading.value = true
  try {
    const result = await api(`/farms/${encodeURIComponent(farmId.value)}/ponds-tanks/available-technicians?areaId=${encodeURIComponent(form.value.areaId)}`)
    if (requestId === technicianRequest) technicians.value = result.data
  } catch (err) {
    if (requestId === technicianRequest) technicianError.value = err.message
  } finally {
    if (requestId === technicianRequest) techniciansLoading.value = false
  }
}

async function openCreate() {
  editing.value = false
  editingTank.value = null
  codeApiError.value = ''
  resetForm()
  farmDialog.value = true
  void loadTechnicians()
  await nextTick()
  tankFormRef.value?.resetValidation()
}

async function openEdit(tank) {
  editing.value = true
  editingTank.value = tank
  codeApiError.value = ''
  form.value = { code: tank.code, name: tank.name, areaId: tank.area?.id || '', responsibleUserId: tank.responsibleUserId || '', tankType: tank.tankType, volumeM3: tank.volumeM3, description: tank.description || '', status: tank.status }
  farmDialog.value = true
  void loadTechnicians()
  await nextTick()
  tankFormRef.value?.resetValidation()
}

async function saveTank() {
  const validation = await tankFormRef.value?.validate()
  if (!validation?.valid) {
    showToast('Vui lòng kiểm tra lại các trường chưa hợp lệ.', 'error')
    return
  }
  const payload = { ...form.value, code: form.value.code.trim().toUpperCase(), name: form.value.name.trim(), volumeM3: form.value.volumeM3 === '' ? '' : Number(form.value.volumeM3), areaId: form.value.areaId || null, responsibleUserId: form.value.responsibleUserId || null }
  saving.value = true
  try {
    const path = editing.value ? `/farms/${encodeURIComponent(farmId.value)}/ponds-tanks/${encodeURIComponent(editingTank.value.id)}` : `/farms/${encodeURIComponent(farmId.value)}/ponds-tanks`
    await api(path, { method: editing.value ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
    farmDialog.value = false
    showToast(editing.value ? 'Đã cập nhật ao/bể.' : 'Đã tạo ao/bể.', 'success')
    await loadTanks()
  } catch (err) {
    if (err.status === 409 && err.message.toLowerCase().includes('mã ao/bể')) codeApiError.value = err.message
    if (err.status === 409 && err.message.includes('5 ao/bể')) {
      form.value.responsibleUserId = ''
      await loadTechnicians()
    }
    showToast(err.message, 'error')
  }
  finally { saving.value = false }
}

function formatVolume(value) {
  return `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} m³`
}

watch(farmId, async () => {
  farmDialog.value = false
  selectedTankId.value = ''
  areaFilter.value = ''
  technicianRequest++
  error.value = ''
  await Promise.all([loadAreas(), loadTanks()])
})
watch(() => form.value.areaId, () => {
  if (!farmDialog.value) return
  form.value.responsibleUserId = ''
  void loadTechnicians()
}, { flush: 'sync' })
watch(() => form.value.code, () => { codeApiError.value = '' })
watch([search, statusFilter, typeFilter], loadTanks)
watch(tankGroups, groups => {
  if (areaFilter.value && !groups.some(group => group.key === areaFilter.value)) areaFilter.value = ''
})
onMounted(loadPage)
</script>

<template>
<AppShell>
    <header class="page-header">
      <div><span class="eyebrow">KHÔNG GIAN NUÔI</span><h1>Ao &amp; bể nuôi</h1></div>
      <v-btn v-if="canManage && selectedFarm" color="primary" prepend-icon="mdi-plus" class="create-tank" @click="openCreate">Thêm ao/bể</v-btn>
    </header>
    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />
    <div v-else-if="error" class="notice error-notice" role="alert">{{ error }}<v-btn variant="text" color="error" @click="loadPage">Thử lại</v-btn></div>
    <template v-else-if="!farms.length">
      <v-card class="empty-card" elevation="0"><div class="empty-icon">+</div><h2>Chưa có trang trại</h2><p>Tạo hoặc tham gia trang trại trước khi quản lý ao/bể.</p><v-btn to="/farms" color="primary">Mở quản lý trang trại</v-btn></v-card>
    </template>
    <template v-else>
      <section class="pond-metrics" aria-label="Trạng thái ao bể trong kết quả lọc">
        <div v-for="metric in [{key:'total',label:'Tổng ao/bể',icon:'mdi-database-outline'},{key:'active',label:'Đang ương',icon:'mdi-fish'},{key:'cleaning',label:'Đang vệ sinh',icon:'mdi-auto-fix'},{key:'empty',label:'Bể trống',icon:'mdi-circle-outline'}]" :key="metric.key" class="pond-metric" :class="metric.key"><span class="metric-icon"><v-icon :icon="metric.icon" size="27" /></span><div><span>{{ metric.label }}</span><strong>{{ statusCounts[metric.key] }}</strong></div></div>
      </section>
      <div class="pond-toolbar">
        <nav class="area-tabs" aria-label="Lọc khu vực"><button type="button" :class="{ active: !areaFilter }" :aria-pressed="!areaFilter" @click="areaFilter = ''">Tất cả khu vực</button><button v-for="group in tankGroups" :key="group.key" type="button" :class="{active:areaFilter === group.key}" :aria-pressed="areaFilter === group.key" @click="areaFilter = group.key">{{ group.name }}</button></nav>
        <div class="list-controls">
          <v-text-field class="list-filter-search" aria-label="Tìm ao bể" placeholder="Tìm mã, tên ao/bể…" v-model="search" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable />
          <v-select aria-label="Trạng thái" v-model="statusFilter" :items="[{title:'Tất cả trạng thái',value:''},...statusOptions]" variant="outlined" density="compact" hide-details />
          <v-select aria-label="Loại ao bể" v-model="typeFilter" :items="[{title:'Tất cả loại',value:''},...typeOptions]" variant="outlined" density="compact" hide-details />
        </div>
        <div class="view-switch" role="group" aria-label="Kiểu hiển thị"><button type="button" :class="{active:viewMode === 'map'}" :aria-pressed="viewMode === 'map'" @click="viewMode = 'map'"><v-icon icon="mdi-view-grid-outline" size="18" />Sơ đồ</button><button type="button" :class="{active:viewMode === 'list'}" :aria-pressed="viewMode === 'list'" @click="viewMode = 'list'"><v-icon icon="mdi-format-list-bulleted" size="19" />Danh sách</button></div>
      </div>
      <v-progress-linear v-if="tanksLoading" indeterminate color="primary" rounded />
      <div v-else-if="!visibleTanks.length" class="empty-state"><v-icon icon="mdi-waves" size="38" /><strong>Chưa có ao/bể phù hợp</strong><p>Thêm ao/bể mới hoặc điều chỉnh bộ lọc.</p></div>
      <div v-else class="tank-layout">
        <aside v-if="selectedTank" class="tank-detail" aria-label="Thông tin ao/bể đã chọn" aria-live="polite">
          <div class="tank-detail-heading"><div><v-icon icon="mdi-database-outline" size="24" /><h2>{{ selectedTank.code }}</h2></div><span class="status-tag" :class="selectedTank.deletedAt ? 'deleted' : selectedTank.status"><i />{{ selectedTank.deletedAt ? 'Đã xóa' : statusNames[selectedTank.status] || selectedTank.status }}</span></div>
          <div class="detail-visual"><img :src="tankIllustration" alt="" /><div><span>{{ typeNames[selectedTank.tankType] || selectedTank.tankType }}</span><h3>{{ selectedTank.name }}</h3><strong>{{ formatVolume(selectedTank.volumeM3) }}</strong></div></div>
          <dl class="tank-detail-rows"><div><dt><v-icon icon="mdi-map-marker-outline" size="17" />Khu vực</dt><dd>{{ selectedTank.area?.name || 'Toàn trại' }}</dd></div><div><dt><v-icon icon="mdi-account-outline" size="17" />Người phụ trách</dt><dd>{{ selectedTank.responsibleUser?.displayName || selectedTank.responsibleUser?.email || 'Chưa phân công' }}</dd></div></dl>
          <p v-if="selectedTank.description" class="tank-description">{{ selectedTank.description }}</p>
          <div class="tank-detail-actions">
          <v-btn v-if="canManage || selectedRole === 'TECHNICIAN'" :to="{path:'/care-logs',query:{tankId:selectedTank.id}}" block color="primary" append-icon="mdi-arrow-right">Nhật kí chăm sóc</v-btn>
          <v-btn v-if="canManage && !selectedTank.deletedAt" block color="primary" variant="outlined" prepend-icon="mdi-pencil-outline" class="mt-3" @click="openEdit(selectedTank)">Chỉnh sửa ao/bể</v-btn>
          </div>
        </aside>
        <div class="tank-groups" role="region" aria-label="Danh sách ao/bể" tabindex="0">
          <section v-for="group in visibleGroups" :key="group.key" class="tank-group" :aria-label="group.name">
            <header class="group-heading"><h2><v-icon icon="mdi-map-marker-outline" size="22" />{{ group.name }}</h2><span>{{ group.tanks.length }} ao/bể</span><span class="group-active"><i />{{ group.tanks.filter(t => t.status === 'active').length }} đang ương</span></header>
            <LocalPages :items="group.tanks" v-slot="{ rows: pageTanks }">
            <div :class="viewMode === 'map' ? 'tank-grid' : 'tank-list'">
              <button v-for="tank in pageTanks" :key="tank.id" type="button" class="tank-tile" :class="[tank.status, {selected:selectedTank?.id === tank.id,deleted:tank.deletedAt}]" :aria-pressed="selectedTank?.id === tank.id" @click="selectedTankId = tank.id">
                <div class="tank-art"><img :src="tankIllustration" alt="" /><span v-if="selectedTank?.id === tank.id" class="selected-marker"><v-icon icon="mdi-check" size="14" /></span></div>
                <div class="tank-tile-caption"><div class="tank-tile-title"><strong>{{ tank.code }}</strong><span class="status-tag" :class="tank.deletedAt ? 'deleted' : tank.status"><i />{{ tank.deletedAt ? 'Đã xóa' : statusNames[tank.status] || tank.status }}</span></div><span class="tank-name">{{ tank.name }}</span><div class="tank-meta"><span><v-icon icon="mdi-water-outline" size="14" />{{ formatVolume(tank.volumeM3) }}</span><span>{{ typeNames[tank.tankType] || tank.tankType }}</span></div></div>
              </button>
            </div>
            </LocalPages>
          </section>
        </div>
      </div>
    </template>

    <v-dialog v-model="farmDialog" max-width="560">
      <v-card class="dialog-card">
          <v-btn class="form-dialog-close" type="button" icon="mdi-close" size="small" variant="text" aria-label="Đóng form" @click="farmDialog = false" />
          <span class="eyebrow">{{ editing ? 'CẬP NHẬT AO/BỂ' : 'AO/BỂ MỚI' }}</span>
        <h2>{{ editing ? 'Chỉnh sửa thông tin' : 'Thêm ao/bể' }}</h2>
        <v-form ref="tankFormRef" class="dialog-form" validate-on="blur" @submit.prevent="singleFlight(saveTank, $event)">
          <div class="field-grid">
            <div>
              <label>Mã ao/bể</label>
              <v-text-field
                v-model="form.code"
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
            hide-details="auto"
          />
          <template v-if="editing">
            <label>Trạng thái</label>
            <v-select v-model="form.status" :items="statusOptions" hide-details="auto" />
          </template>
          <label>Nhân viên phụ trách</label>
          <v-select
            v-model="form.responsibleUserId"
            clearable
            :items="technicianOptions"
            :loading="techniciansLoading"
            :disabled="!form.areaId || techniciansLoading"
            :placeholder="!form.areaId ? 'Chọn khu vực trước' : undefined"
            no-data-text="Không có nhân viên kỹ thuật còn chỗ trong khu vực này."
          />
          <div v-if="technicianError" class="error-notice" role="alert">{{ technicianError }}</div>
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
            <v-btn type="submit" color="primary" :loading="saving" :disabled="techniciansLoading">{{ editing ? 'Lưu thay đổi' : 'Tạo ao/bể' }}</v-btn>
          </div>
        </v-form>
      </v-card>
    </v-dialog>
  </AppShell>
</template>

<style scoped>
*{box-sizing:border-box}.page-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}.page-header h1{margin:0}.eyebrow{display:block;font-size:9px;font-weight:700;letter-spacing:.16em;color:#588b80;margin-bottom:6px}.create-tank{box-shadow:0 5px 12px #087f6e22}.pond-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:24px}.pond-metric{display:flex;align-items:center;gap:17px;padding:20px;background:linear-gradient(130deg,#fff,#f7fcfc);border:1px solid #d8e8e9;border-radius:16px;box-shadow:0 4px 12px #245a6610}.metric-icon{width:52px;height:52px;display:grid;place-items:center;flex-shrink:0;border-radius:14px;background:#e1f5ef;color:#079c87}.pond-metric>div>span{font-size:12px;color:#47666d}.pond-metric strong{display:block;font-size:29px;line-height:1.4;color:#164d47}.pond-metric.cleaning .metric-icon{background:#fff2dc;color:#c79534}.pond-metric.empty .metric-icon{background:#eef3f6;color:#739399}.pond-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:14px;margin-bottom:22px}.area-tabs{display:flex;flex-wrap:wrap;gap:7px;flex:1 1 100%}.area-tabs button{border:1px solid #c9dedb;border-radius:24px;padding:9px 16px;font-size:12px;color:#38665d;background:#fff;cursor:pointer;min-height:38px}.area-tabs button.active{color:#fff;border-color:#087f6e;background:linear-gradient(135deg,#119989,#07645d);box-shadow:0 3px 7px #087f6e19}.pond-filters{display:grid;grid-template-columns:minmax(170px,1.6fr) minmax(140px,1fr) minmax(120px,.8fr);gap:12px;flex:1;min-width:0}.pond-filters :deep(.v-field){background:#fff;border-radius:10px;font-size:12px}.view-switch{display:flex;gap:4px;border:1px solid #d6e5e7;border-radius:11px;padding:4px;background:#fff;flex-shrink:0}.view-switch button{border:0;background:transparent;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 12px;min-height:36px;border-radius:8px;font-size:12px;color:#56757b;cursor:pointer}.view-switch button.active{background:#087f6e;color:#fff;box-shadow:0 2px 5px #075e5820}.tank-layout{display:grid;grid-template-columns:minmax(0,1fr) 315px;gap:20px;align-items:start}.tank-groups{min-width:0}.tank-group{overflow:hidden;border:1px solid #d8e6e5;background:#fff;border-radius:18px;box-shadow:0 4px 15px #245a6610}.tank-group+.tank-group{margin-top:20px}.group-heading{display:flex;align-items:center;flex-wrap:wrap;gap:15px;padding:18px}.group-heading h2{display:flex;align-items:center;gap:7px;margin:0!important;font-size:17px!important;color:#164d47!important}.group-heading>span{font-size:11px;color:#68847d;border-left:1px solid #dce7e2;padding-left:14px}.group-active{display:flex;align-items:center;gap:6px}.status-tag i,.group-active i{display:inline-block;width:6px;height:6px;flex-shrink:0;border-radius:50%;background:currentColor}.group-active i{color:#12a77b}.tank-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:17px;background-color:#e5edda;background-image:linear-gradient(#c0d2b426 1px,transparent 1px),linear-gradient(90deg,#c0d2b426 1px,transparent 1px);background-size:22px 22px;border:7px solid #f1f6ed;border-radius:16px;margin:0 9px 9px}.tank-tile{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;min-width:0;border:1px solid #d0ddc5;border-radius:15px;background:#f5f9edb3;text-align:left;cursor:pointer;transition:box-shadow .18s,border-color .18s;overflow:hidden}.tank-tile:hover{border-color:#4d9b83;box-shadow:0 4px 14px #225d3620}.tank-tile.selected{border-color:#07977f;box-shadow:0 0 0 2px #07977f}.tank-art{position:relative;padding:3px 7px 0}.tank-art img{display:block;width:100%;aspect-ratio:240/205;object-fit:contain;filter:drop-shadow(0 4px 4px #174c3e12)}.selected-marker{position:absolute;top:9px;right:9px;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#078974;color:white;box-shadow:0 2px 6px #154e3e25}.tank-tile-caption{padding:11px;margin:0 6px 6px;background:#fffffff2;border:1px solid #dce8df;border-radius:10px;overflow-wrap:anywhere}.tank-tile-title{display:flex;align-items:center;justify-content:space-between;gap:5px;flex-wrap:wrap}.tank-tile-title strong{font-size:17px;color:#17584e}.status-tag{display:inline-flex;align-items:center;gap:5px;padding:4px 6px;border-radius:6px;font-size:9px;font-weight:600;white-space:nowrap;background:#edf3f2;color:#6e8781}.status-tag.active{background:#dcf7eb;color:#00845e}.status-tag.cleaning{background:#fff1d3;color:#ab750c}.status-tag.empty{background:#eaf2f6;color:#65858d}.status-tag.inactive,.status-tag.deleted{color:#808d89;background:#eef0ee}.tank-name{display:block;margin-top:5px;font-size:10px;color:#6c867c}.tank-meta{display:flex;justify-content:space-between;flex-wrap:wrap;gap:5px;margin-top:8px;font-size:10px;color:#376b5d}.tank-meta>span{display:flex;align-items:center;gap:3px}.tank-tile.inactive .tank-art,.tank-tile.deleted .tank-art{filter:grayscale(.8);opacity:.65}.tank-tile.empty .tank-art{opacity:.7}.tank-detail{position:sticky;top:12px;padding:19px;border:1px solid #d3e4e4;border-radius:18px;background:linear-gradient(145deg,#fff,#f8fcfc);box-shadow:0 4px 15px #245a6610;min-width:0}.tank-detail-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #e0ebe7;padding-bottom:15px}.tank-detail-heading>div{display:flex;align-items:center;gap:9px;color:#079a83}.tank-detail-heading h2{margin:0!important;font-size:22px!important;color:#194e47!important;overflow-wrap:anywhere}.detail-visual{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center;margin:18px 0}.detail-visual>img{width:100%;min-width:0}.detail-visual>div{min-width:0}.detail-visual span{font-size:10px;color:#82958b}.detail-visual h3{font-size:13px;color:#315d51;margin:7px 0;overflow-wrap:anywhere}.detail-visual strong{display:inline-block;font-size:16px;color:#0c7965;background:#e6f5ee;padding:5px 8px;border-radius:6px}.tank-detail-rows{margin:0 0 20px}.tank-detail-rows>div{padding:14px 0;border-bottom:1px solid #e1ebe7}.tank-detail-rows dt{display:flex;align-items:center;gap:6px;color:#6a867c;font-size:11px}.tank-detail-rows dd{margin:7px 0 0;color:#285c4d;font-size:13px;font-weight:600;overflow-wrap:anywhere}.tank-description{font-size:12px;color:#779084;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.tank-list{padding:0 16px 16px;display:grid;gap:9px}.tank-list .tank-tile{display:flex;flex-direction:row;align-items:center;background:#f8fbf9;border-color:#deebe3}.tank-list .tank-art{width:85px;flex-shrink:0;padding:0}.tank-list .tank-tile-caption{flex:1;margin:0;border:0;background:transparent}.tank-list .tank-name{margin-top:2px}.tank-list .tank-meta{justify-content:flex-start;gap:15px}.tank-list .selected-marker{top:3px;right:2px;width:18px;height:18px}.tank-tile:focus-visible,.area-tabs button:focus-visible,.view-switch button:focus-visible{outline:3px solid #087f6e;outline-offset:3px}.empty-state,.empty-card{text-align:center;padding:45px 20px;background:white;border:1px solid #dce7e4;border-radius:16px;color:#70817e}.empty-state strong{display:block;margin:14px 0 8px;color:#365b51}.empty-state p,.empty-card p{font-size:12px}.empty-card h2{font-size:18px}.notice{padding:16px;border-radius:12px;font-size:13px}.error-notice{color:#9b3e3e;background:#fff0ef}.dialog-card{padding:30px;border-radius:20px!important}.dialog-form{display:grid;gap:9px;margin-top:23px}.dialog-form label{font-size:11px;font-weight:700;color:#48625e}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}
@media(min-width:1350px){.tank-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:1250px){.tank-layout{grid-template-columns:minmax(0,1fr) 280px;gap:16px}.tank-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pond-metric{padding:16px;gap:10px}.metric-icon{width:42px;height:42px}.pond-filters{flex-basis:100%}}@media(max-width:900px){.tank-layout{grid-template-columns:minmax(0,1fr)}.tank-detail{position:static}.pond-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.tank-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.detail-visual{grid-template-columns:140px 1fr}.tank-detail-rows{display:grid;grid-template-columns:1fr 1fr;gap:20px}}@media(max-width:600px){.page-header{gap:10px;margin-bottom:18px}.page-header h1{font-size:22px!important}.eyebrow{font-size:8px}.create-tank{font-size:11px!important;padding-inline:10px!important}.pond-metrics{gap:10px;margin-bottom:18px}.pond-metric{padding:13px;gap:10px;border-radius:12px}.metric-icon{width:34px;height:38px}.metric-icon .v-icon{font-size:22px!important}.pond-metric>div>span{font-size:10px}.pond-metric strong{font-size:23px}.pond-filters{grid-template-columns:1fr 1fr;gap:10px}.pond-filters>.v-input:first-child{grid-column:1/-1}.pond-toolbar{gap:12px}.area-tabs{gap:6px}.area-tabs button{padding:8px 12px;font-size:11px}.view-switch{width:100%}.view-switch button{flex:1}.tank-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:9px;gap:9px;border-width:4px;margin:0 6px 6px}.group-heading{gap:10px;padding:14px}.group-heading>span{padding-left:9px;font-size:10px}.group-heading .group-active{display:none}.tank-tile-caption{padding:8px;margin:0 4px 4px}.tank-tile-title strong{font-size:15px}.tank-tile-title{align-items:flex-start;flex-direction:column;gap:5px}.tank-name{font-size:10px}.tank-meta{font-size:9px}.tank-art{padding:0}.tank-detail{padding:17px}.tank-detail-rows{gap:12px}.field-grid{grid-template-columns:1fr}.dialog-card{padding:22px}}
@media(prefers-reduced-motion:reduce){.tank-tile{transition:none}}

.tank-layout > .tank-groups { grid-column: 1; grid-row: 1; }
.tank-layout > .tank-detail { grid-column: 2; grid-row: 1; }
.tank-groups:focus-visible { outline: 2px solid #087f6e; outline-offset: -2px; }

@media (max-width: 900px) {
  .tank-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    height: max(300px, calc(100dvh - 90px));
    align-items: stretch;
    gap: 12px;
  }
  .tank-layout > .tank-detail {
    grid-column: 1;
    grid-row: 1;
    max-height: min(360px, calc(max(300px, 100dvh - 90px) - 130px));
    overflow-y: auto;
    padding: 12px 14px;
  }
  .tank-layout > .tank-groups {
    grid-column: 1;
    grid-row: 2;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    border-radius: 14px;
  }
  .tank-detail-heading { padding-bottom: 8px; }
  .detail-visual { grid-template-columns: 74px minmax(0, 1fr); margin-block: 8px; }
  .tank-detail-rows { margin-bottom: 8px; }
  .tank-detail-rows > div { min-width: 0; padding-block: 6px; }
  .tank-description { margin-block: 6px 10px; overflow-wrap: anywhere; }
}

@media (max-width: 600px) {
  .tank-layout > .tank-detail { padding: 9px 11px; }
  .tank-detail-heading { padding-bottom: 5px; }
  .tank-detail-heading h2 { font-size: 17px !important; }
  .tank-detail-heading .v-icon { font-size: 17px !important; }
  .detail-visual { grid-template-columns: 44px minmax(0, 1fr); margin-block: 5px; }
  .detail-visual > div { display: flex; align-items: center; flex-wrap: wrap; gap: 2px 8px; }
  .detail-visual h3 { margin: 0; font-size: 12px; }
  .detail-visual strong { padding: 2px 5px; font-size: 12px; }
  .tank-detail-rows { gap: 8px; margin-bottom: 3px; }
  .tank-detail-rows > div { padding-block: 3px; border: 0; }
  .tank-detail-rows dt { font-size: 10px; }
  .tank-detail-rows dd { margin-top: 2px; font-size: 11px; }
  .tank-description { margin: 3px 0 7px; font-size: 10px; }
  .tank-detail-actions { display: flex; flex-wrap: wrap; gap: 6px; }
  .tank-detail-actions > .v-btn {
    flex: 1 1 120px;
    min-width: 0;
    min-height: 34px;
    margin: 0 !important;
    padding-inline: 6px;
    font-size: 10px;
  }
  .tank-detail-actions > .v-btn--block { width: auto; min-width: 0; }
}
</style>
