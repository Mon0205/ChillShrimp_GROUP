<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../../components/shell/index.vue'
import Pagination from '../../components/pagination/index.vue'
import DateRange from '../care/components/DateRange.vue'
import { useAuth } from '../../composables/auth.js'
import { useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const context = useFarmContext()
const auth = useAuth()
const route = useRoute()
const router = useRouter()
const role = computed(() => context.farms.find(farm => farm.id === context.farmId)?.role)
const canView = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(role.value))
const wholeFarm = computed(() => ['OWNER', 'FARM_MANAGER'].includes(role.value))
const filters = ref({ severity: '', isRead: '', status: '', areaId: '', tankId: '', from: '', to: '' })
const areas = ref([])
const tanks = ref([])
const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const error = ref('')
const optionsError = ref('')
const detail = ref(null)
const detailLoading = ref(false)
const detailError = ref('')
const saving = ref(false)
const actionError = ref('')
const notes = ref('')
const nextStatus = ref('in_progress')
const assignees = ref([]), assigneeId = ref(''), assigneesLoading = ref(false), assigneesError = ref('')
const manager = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER'].includes(role.value))
const canWork = computed(() => ['TECHNICIAN', 'AREA_MANAGER'].includes(role.value))
const canHandle = computed(() => canWork.value && detail.value?.status !== 'resolved' && Boolean(auth.user?.id) && detail.value?.responsibleUserId === auth.user.id && Boolean(detail.value.acceptedAt))
const canClaim = computed(() => canWork.value && Boolean(auth.user?.id) && detail.value && detail.value.status !== 'resolved' && !canHandle.value && (!detail.value.responsibleUserId || detail.value.responsibleUserId === auth.user.id))
const responsibleName = alert => alert.responsibleUser?.displayName || alert.responsibleUser?.email || alert.responsibleUserId || 'Chưa phân công'
let assigneesController
const statusNames = { open: 'Chưa xử lý', in_progress: 'Đang xử lý', resolved: 'Đã xử lý' }
const severityNames = { warning: 'Cảnh báo', critical: 'Nguy hiểm' }
const isDetailPage = computed(() => typeof route.query.alertId === 'string' && Boolean(route.query.alertId))
const pageSummary = computed(() => {
  const pending = items.value.filter(item => item.status !== 'resolved')
  return { pending: pending.length, critical: pending.filter(item => item.severity === 'critical').length, inProgress: pending.filter(item => item.status === 'in_progress').length, unassigned: pending.filter(item => !item.responsibleUserId).length }
})
const statusColor = status => ({ open: 'default', in_progress: 'info', resolved: 'success' })[status] || 'default'
const initials = alert => responsibleName(alert).split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase()

const visibleTanks = computed(() => filters.value.areaId ? tanks.value.filter(tank => tank.areaId === filters.value.areaId) : tanks.value)
let listController
let detailController
let optionsController
let actionController
let timer
const url = (farmId, suffix = '') => `/farms/${encodeURIComponent(farmId)}/environment-thresholds/alerts${suffix}`
const dateTime = value => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
const valueText = value => value === null || value === undefined ? '—' : Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 3 })
function notifyRefresh() { window.dispatchEvent(new Event('alerts:refresh')) }

async function loadList() {
  listController?.abort()
  const current = new AbortController()
  listController = current
  if (!canView.value || !context.farmId) { items.value = []; total.value = 0; loading.value = false; return }
  const params = new URLSearchParams({ page: String(page.value), limit: String(pageSize.value) })
  for (const [key, value] of Object.entries(filters.value)) {
    if (!value) continue
    params.set(key, key === 'from' ? new Date(`${value}T00:00:00`).toISOString() : key === 'to' ? new Date(`${value}T23:59:59.999`).toISOString() : value)
  }
  loading.value = true
  error.value = ''
  try {
    const result = await api(url(context.farmId, `?${params}`), { signal: current.signal })
    if (current.signal.aborted) return
    const lastPage = Math.max(1, Math.ceil(result.data.pagination.total / pageSize.value))
    if (page.value > lastPage) { page.value = lastPage; return }
    items.value = result.data.items
    total.value = result.data.pagination.total
  } catch (err) {
    if (!current.signal.aborted) { items.value = []; total.value = 0; error.value = err.message }
  } finally { if (!current.signal.aborted) loading.value = false }
}
async function loadOptions() {
  optionsController?.abort()
  const current = new AbortController()
  optionsController = current
  areas.value = []; tanks.value = []; optionsError.value = ''
  if (!canView.value || !context.farmId) return
  const root = `/farms/${encodeURIComponent(context.farmId)}`
  try {
    const [tankResult, areaResult] = await Promise.all([
      api(`${root}/ponds-tanks`, { signal: current.signal }),
      wholeFarm.value ? api(`${root}/areas`, { signal: current.signal }) : Promise.resolve({ data: [] }),
    ])
    if (!current.signal.aborted) { tanks.value = tankResult.data; areas.value = areaResult.data }
  } catch (err) { if (!current.signal.aborted) optionsError.value = err.message }
}
async function openDetail(id) {
  actionController?.abort(); assigneesController?.abort(); saving.value = false; assignees.value = []; assigneeId.value = ''; assigneesError.value = ''; assigneesLoading.value = false
  detailController?.abort()
  const current = new AbortController()
  detailController = current
  detail.value = null; detailError.value = ''; actionError.value = ''; notes.value = ''
  if (!id || !canView.value || !context.farmId) { detailLoading.value = false; return }
  detailLoading.value = true
  const farmId = context.farmId
  try {
    const result = await api(url(farmId, `/${encodeURIComponent(id)}`), { signal: current.signal })
    if (current.signal.aborted) return
    detail.value = result.data
    nextStatus.value = result.data.status === 'open' ? 'in_progress' : 'resolved'
    loadAssignees()
    if (!result.data.isRead) {
      const receipt = await api(url(farmId, `/${encodeURIComponent(id)}/read`), { method: 'PATCH', signal: current.signal })
      if (current.signal.aborted) return
      Object.assign(detail.value, receipt.data)
      notifyRefresh()
      loadList()
    }
  } catch (err) { if (!current.signal.aborted) detailError.value = err.message }
  finally { if (!current.signal.aborted) detailLoading.value = false }
}
function closeDetail() {
  const query = { ...route.query }; delete query.alertId
  router.replace({ path: '/alerts', query })
}
async function loadAssignees() {
  assigneesController?.abort(); const current = assigneesController = new AbortController()
  assignees.value = []; assigneesError.value = ''; assigneesLoading.value = false
  if (!manager.value || !detail.value || detail.value.status === 'resolved') return
  const id = detail.value.id
  assigneeId.value = detail.value.responsibleUserId || ''; assigneesLoading.value = true
  try {
    const result = await api(url(context.farmId, `/${encodeURIComponent(id)}/assignees`), { signal: current.signal })
    if (!current.signal.aborted) assignees.value = result.data.items.filter(user => user.id !== auth.user?.id)
  } catch (err) { if (!current.signal.aborted) assigneesError.value = err.message }
  finally { if (!current.signal.aborted) assigneesLoading.value = false }
}
async function mutateResponsibility(suffix, method, body) {
  if (!detail.value || saving.value || !canView.value) return
  actionController?.abort(); const current = actionController = new AbortController()
  const id = detail.value.id; const farmId = context.farmId
  saving.value = true; actionError.value = ''
  try {
    const result = await api(url(farmId, `/${encodeURIComponent(id)}/${suffix}`), { method, signal: current.signal, body: JSON.stringify({ ...body, assignmentVersion: detail.value.assignmentVersion }) })
    if (current.signal.aborted) return
    detail.value = { ...detail.value, ...result.data }; notes.value = ''; nextStatus.value = 'resolved'
    loadAssignees(); loadList(); notifyRefresh()
  } catch (err) {
    if (!current.signal.aborted) {
      actionError.value = err.message
      if (err.status === 409) { showToast(err.message, 'error'); await openDetail(id); loadList() }
    }
  } finally { if (!current.signal.aborted) saving.value = false }
}
async function claim() { if (canClaim.value) await mutateResponsibility('claim', 'POST', {}) }
async function reassign() {
  if (!manager.value || !detail.value || detail.value.status === 'resolved') return
  if (assigneeId.value === auth.user?.id || !assignees.value.some(user => user.id === assigneeId.value)) { actionError.value = 'Chọn người phụ trách hợp lệ.'; return }
  await mutateResponsibility('assignee', 'PATCH', { responsibleUserId: assigneeId.value })
}
async function saveHandling() {
  if (!canHandle.value || saving.value) return
  if (!notes.value.trim() || notes.value.trim().length > 4000) { actionError.value = 'Nhập ghi chú xử lý từ 1 đến 4.000 ký tự.'; return }
  await mutateResponsibility('status', 'PATCH', { status: nextStatus.value, notes: notes.value.trim() })
}
function refreshVisible() { if (!document.hidden && !detailLoading.value && !saving.value) loadList() }
watch([() => context.farmId, () => role.value, () => auth.user?.id, () => context.farms.find(farm => farm.id === context.farmId)?.area?.id], () => {
  assigneesController?.abort(); assignees.value = []; assigneeId.value = ''; assigneesError.value = ''; assigneesLoading.value = false
  actionController?.abort(); detailController?.abort(); saving.value = false; detailLoading.value = false
  page.value = 1
  filters.value = { severity: '', isRead: '', status: '', areaId: '', tankId: '', from: '', to: '' }
  detail.value = null; items.value = []; total.value = 0; detailError.value = ''; error.value = ''
  loadOptions(); loadList()
  // A notification id belongs to the previously selected farm; never carry it into another farm.
  if (route.query.alertId) closeDetail()
}, { immediate: false, flush: 'sync' })
watch(page, loadList)
watch(pageSize, () => { if (page.value === 1) loadList(); else page.value = 1 })
watch(filters, () => { if (page.value === 1) loadList(); else page.value = 1 }, { deep: true })
watch(() => filters.value.areaId, () => { filters.value.tankId = '' })
watch(() => [route.query.alertId, canView.value], ([id]) => {
  actionController?.abort(); saving.value = false
  openDetail(typeof id === 'string' ? id : '')
}, { immediate: true, flush: 'sync' })
loadOptions(); loadList()
timer = setInterval(refreshVisible, 30000)
onBeforeUnmount(() => {
  listController?.abort(); detailController?.abort(); optionsController?.abort(); actionController?.abort(); assigneesController?.abort()
  clearInterval(timer)
})
</script>

<template>
  <AppShell>
    <section class="alerts-page">
      <v-alert v-if="!canView" type="info" variant="tonal">{{ context.farmId ? 'Bạn không có quyền xem cảnh báo của trang trại này.' : 'Chọn trang trại để xem cảnh báo.' }}</v-alert>
      <template v-else-if="isDetailPage">
        <div class="detail-navigation"><v-btn variant="text" prepend-icon="mdi-arrow-left" :disabled="saving" @click="closeDetail">Quay lại danh sách cảnh báo</v-btn><span>Cảnh báo môi trường / Chi tiết</span></div>
        <header class="page-header detail-heading">
          <div><p class="eyebrow">GIÁM SÁT & XỬ LÝ</p><h1>{{ detail?.title || 'Chi tiết cảnh báo' }}</h1><p>{{ detail ? `${detail.tank?.name || 'Ao/bể'} · ${dateTime(detail.sourceLog?.recordedAt || detail.createdAt)}` : 'Thông tin đo, phân công và kết quả xử lý.' }}</p></div>
          <div v-if="detail" class="heading-badges"><v-chip :color="detail.severity === 'critical' ? 'error' : 'warning'" variant="tonal" size="small"><v-icon icon="mdi-circle-medium" start />{{ severityNames[detail.severity] }}</v-chip><v-chip :color="statusColor(detail.status)" variant="tonal" size="small">{{ statusNames[detail.status] }}</v-chip></div>
        </header>
        <v-progress-linear v-if="detailLoading" indeterminate color="primary" aria-label="Đang tải chi tiết cảnh báo" />
        <v-alert v-if="detailError" type="error" variant="tonal">{{ detailError }}<v-btn variant="text" @click="openDetail(route.query.alertId)">Thử lại</v-btn></v-alert>
        <div v-if="detail && !detailError" class="detail-layout">
          <div class="detail-column">
            <section class="surface detail-card" aria-labelledby="measurement-heading">
              <div class="card-heading"><v-icon icon="mdi-water-thermometer-outline" color="primary" /><h2 id="measurement-heading">Thông tin đo môi trường</h2></div>
              <p class="detail-message">{{ detail.message }}</p>
              <div class="measurement" :class="{ critical: detail.severity === 'critical' }"><div><span>GIÁ TRỊ ĐO ĐƯỢC</span><strong>{{ valueText(detail.observedValue) }} <small>{{ detail.threshold?.unit || '' }}</small></strong></div><div class="optimal"><span>Khoảng phù hợp</span><b>{{ valueText(detail.threshold?.optimalMin) }} – {{ valueText(detail.threshold?.optimalMax) }} {{ detail.threshold?.unit || '' }}</b></div></div>
              <dl class="detail-grid">
                <div><dt>Ao/bể</dt><dd>{{ detail.tank?.name || '—' }}<small>{{ detail.tank?.code || '—' }}</small></dd></div><div><dt>Lô giống</dt><dd>{{ detail.batch?.batchCode || '—' }}</dd></div>
                <div><dt>Thời điểm đo</dt><dd>{{ dateTime(detail.sourceLog?.recordedAt) }}</dd></div><div><dt>Thời điểm cảnh báo</dt><dd>{{ dateTime(detail.createdAt) }}</dd></div>
                <div><dt>Giới hạn cảnh báo (min / max)</dt><dd>{{ valueText(detail.threshold?.warningMin) }} / {{ valueText(detail.threshold?.warningMax) }}</dd></div><div><dt>Giới hạn nguy hiểm (min / max)</dt><dd>{{ valueText(detail.threshold?.dangerMin) }} / {{ valueText(detail.threshold?.dangerMax) }}</dd></div>
                <div><dt>Trạng thái đọc</dt><dd>{{ detail.isRead ? 'Đã đọc' : 'Chưa đọc' }}<small>{{ dateTime(detail.readAt) }}</small></dd></div>
              </dl>
              <v-btn v-if="detail.tank" variant="outlined" color="primary" prepend-icon="mdi-notebook-outline" :to="{ path: '/care-logs', query: { tab: 'water-parameters', tankId: detail.tank.id } }">Xem nhật ký môi trường của bể</v-btn>
            </section>
            <section class="surface detail-card" aria-labelledby="handling-heading">
              <div class="card-heading"><v-icon icon="mdi-clipboard-check-outline" color="primary" /><h2 id="handling-heading">Kết quả xử lý</h2></div>
              <div v-if="detail.handledAt" class="handling-summary"><strong>Lần cập nhật gần nhất</strong><p>{{ detail.handler?.displayName || detail.handler?.email || '—' }} · {{ dateTime(detail.handledAt) }}</p><p class="notes">{{ detail.handlingNotes }}</p></div>
              <p v-else class="muted">Chưa có kết quả kiểm tra hoặc biện pháp xử lý được ghi nhận.</p>
              <p class="helper">Đã đọc không có nghĩa đã khắc phục. Khi xác nhận đã xử lý, ghi kết quả đo lại hoặc biện pháp kiểm tra.</p>
              <v-form v-if="canHandle" class="handling-form" @submit.prevent="saveHandling">
                <v-select v-model="nextStatus" label="Cập nhật xử lý" :disabled="saving" :items="detail.status === 'open' ? [{ title: 'Đang xử lý', value: 'in_progress' }, { title: 'Đã xử lý', value: 'resolved' }] : [{ title: 'Đã xử lý', value: 'resolved' }]" />
                <v-textarea v-model="notes" label="Biện pháp / kết quả kiểm tra *" :disabled="saving" maxlength="4000" counter="4000" rows="4" :error-messages="actionError" @update:model-value="actionError = ''" />
                <v-btn type="submit" color="primary" :loading="saving" :disabled="detailLoading">Lưu xử lý</v-btn>
              </v-form>
            </section>
          </div>
          <aside class="detail-column">
            <section class="surface detail-card" aria-labelledby="responsibility-heading">
              <div class="card-heading"><v-icon icon="mdi-account-check-outline" color="primary" /><h2 id="responsibility-heading">Người phụ trách xử lý</h2></div>
              <div class="assignee-card"><v-avatar color="primary" variant="tonal" size="42"><span v-if="detail.responsibleUserId">{{ initials(detail) }}</span><v-icon v-else icon="mdi-account-outline" /></v-avatar><div><strong>{{ responsibleName(detail) }}</strong><small>{{ detail.responsibleUserId ? (detail.acceptedAt ? 'Đã nhận xử lý' : 'Chờ nhận việc') : 'Cần giao người phụ trách' }}</small></div></div>
              <dl class="detail-grid assignment-meta"><div><dt>Giao lúc</dt><dd>{{ dateTime(detail.assignedAt) }}</dd></div><div><dt>Nhận xử lý lúc</dt><dd>{{ detail.acceptedAt ? dateTime(detail.acceptedAt) : 'Chưa nhận xử lý' }}</dd></div></dl>
              <v-alert v-if="actionError" type="error" variant="tonal" class="mb-4">{{ actionError }}</v-alert>
              <v-btn v-if="canClaim" color="primary" block :loading="saving" :disabled="detailLoading" @click="claim">Nhận xử lý</v-btn>
              <v-form v-if="manager && detail.status !== 'resolved'" class="assignment-form" @submit.prevent="reassign">
                <v-alert v-if="assigneesError" type="error" variant="tonal" class="mb-4">{{ assigneesError }}<v-btn variant="text" @click="loadAssignees">Thử lại</v-btn></v-alert>
                <v-select v-model="assigneeId" label="Giao người phụ trách" :items="assignees" item-value="id" :item-title="user => user.displayName || user.email || user.id" :loading="assigneesLoading" :disabled="saving || assigneesLoading" />
                <v-btn type="submit" variant="outlined" color="primary" block :loading="saving" :disabled="saving || assigneesLoading || !assigneeId">{{ detail.responsibleUserId ? 'Giao lại' : 'Giao việc' }}</v-btn>
              </v-form>
              <p v-if="detail.status !== 'resolved' && !canHandle" class="helper">Chỉ kỹ thuật viên hoặc quản lý khu vực cùng khu vực của bể được tự nhận và xử lý cảnh báo. Quản lý có thể giao việc cho người đủ điều kiện khác, không tự giao cho mình.</p>
              <p v-if="manager && detail.status !== 'resolved'" class="scope-note"><v-icon icon="mdi-shield-check-outline" size="18" />Chỉ giao cho nhân viên đang hoạt động đúng trại và khu vực của bể.</p>
              <p v-if="detail.status === 'resolved'" class="scope-note"><v-icon icon="mdi-check-circle-outline" size="18" />Cảnh báo đã kết thúc xử lý.</p>
            </section>
            <section class="workflow" aria-label="Quy trình xử lý"><h2>Theo dõi đến khi hoàn tất</h2><div><b>1</b><p><strong>Phân công đúng người</strong><small>Người được giao nhận thông báo cá nhân.</small></p></div><div><b>2</b><p><strong>Nhận việc và kiểm tra</strong><small>Người phụ trách tự xác nhận nhận xử lý.</small></p></div><div><b>3</b><p><strong>Ghi nhận kết quả</strong><small>Lưu biện pháp hoặc kết quả đo lại để kết thúc.</small></p></div></section>
          </aside>
        </div>
      </template>
      <template v-else>
        <header class="page-header"><div><p class="eyebrow">GIÁM SÁT & XỬ LÝ</p><h1>Cảnh báo môi trường</h1><p>Nắm bắt bất thường. Giao đúng người. Theo dõi đến khi xử lý xong.</p></div><v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="loading" @click="loadList(); loadOptions(); notifyRefresh()">Làm mới</v-btn></header>
        <div v-if="!error" class="summary-strip" aria-label="Tóm tắt cảnh báo trên trang hiện tại"><div class="summary-item highlight"><span><v-icon icon="mdi-alert-circle-outline" size="17" />Cần chú ý</span><strong>{{ loading ? '—' : pageSummary.pending }}</strong><small>Chưa kết thúc trên trang này</small></div><div class="summary-item"><span>Nguy hiểm</span><strong class="danger">{{ loading ? '—' : pageSummary.critical }}</strong><small>Ưu tiên kiểm tra ngay</small></div><div class="summary-item"><span>Đang xử lý</span><strong>{{ loading ? '—' : pageSummary.inProgress }}</strong><small>Trên trang hiện tại</small></div><div class="summary-item"><span>Chưa phân công</span><strong class="warning">{{ loading ? '—' : pageSummary.unassigned }}</strong><small>Trên trang hiện tại</small></div></div>
        <section class="surface list-card" aria-labelledby="alerts-list-heading">
          <div class="list-heading"><h2 id="alerts-list-heading">Danh sách cảnh báo <span class="count">{{ total }}</span></h2><small>Theo bộ lọc đang chọn</small></div>
          <v-tabs v-model="filters.status" color="primary" class="status-tabs" aria-label="Trạng thái xử lý cảnh báo"><v-tab value="">Tất cả</v-tab><v-tab value="open">Chưa xử lý</v-tab><v-tab value="in_progress">Đang xử lý</v-tab><v-tab value="resolved">Đã xử lý</v-tab></v-tabs>
          <div class="filters"><v-select v-model="filters.severity" density="compact" label="Mức độ" :items="[{ title: 'Cảnh báo', value: 'warning' }, { title: 'Nguy hiểm', value: 'critical' }]" clearable hide-details /><v-select v-model="filters.isRead" density="compact" label="Trạng thái đọc" :items="[{ title: 'Chưa đọc', value: 'false' }, { title: 'Đã đọc', value: 'true' }]" clearable hide-details /><v-select v-if="wholeFarm" v-model="filters.areaId" density="compact" label="Khu vực" :items="areas" item-title="name" item-value="id" clearable hide-details /><v-select v-model="filters.tankId" density="compact" label="Ao/bể" :items="visibleTanks" item-title="name" item-value="id" clearable hide-details /><DateRange v-model="filters" /></div>
          <v-alert v-if="optionsError" type="warning" variant="tonal" class="ma-4">Không tải được bộ lọc: {{ optionsError }}</v-alert>
          <v-progress-linear v-if="loading" indeterminate color="primary" aria-label="Đang tải cảnh báo" />
          <v-alert v-if="error" type="error" variant="tonal" class="ma-4">{{ error }} <v-btn variant="text" @click="loadList">Thử lại</v-btn></v-alert>
          <div v-else-if="!loading && !items.length" class="empty"><v-icon icon="mdi-check-decagram-outline" size="38" color="primary" /><h3>Không có cảnh báo phù hợp</h3><p>Thử thay đổi trạng thái, ao/bể hoặc khoảng ngày để xem thêm.</p></div>
          <div v-else class="table-wrap" :aria-busy="loading"><v-table class="app-data-table alerts-table"><thead><tr><th>Cảnh báo / Thời điểm</th><th>Ao / bể</th><th>Mức độ</th><th>Người phụ trách</th><th>Trạng thái</th><th><span class="sr-only">Thao tác</span></th></tr></thead><tbody><tr v-for="item in items" :key="item.id" :class="{ unread: !item.isRead }"><td class="message-cell"><div class="alert-label"><span class="alert-symbol" :class="item.severity"><v-icon :icon="item.severity === 'critical' ? 'mdi-alert-octagon-outline' : 'mdi-alert-outline'" size="19" /></span><div><strong>{{ item.title }}</strong><small>{{ dateTime(item.createdAt) }} · <span :class="{ 'read-label': !item.isRead }">{{ item.isRead ? 'Đã đọc' : 'Chưa đọc' }}</span></small></div></div></td><td><strong>{{ item.tank?.name || '—' }}</strong><small>{{ item.tank?.code || '—' }}</small></td><td><v-chip size="small" variant="tonal" :color="item.severity === 'critical' ? 'error' : 'warning'">{{ severityNames[item.severity] || item.severity }}</v-chip><small v-if="item.observedValue != null">{{ valueText(item.observedValue) }} {{ item.threshold?.unit || '' }}</small></td><td><div v-if="item.responsibleUserId" class="person"><v-avatar color="primary" variant="tonal" size="29">{{ initials(item) }}</v-avatar><span>{{ responsibleName(item) }}</span></div><span v-else class="warning">Chưa phân công</span><small>{{ item.responsibleUserId ? (item.acceptedAt ? 'Đã nhận xử lý' : 'Chờ nhận việc') : 'Cần giao việc' }}</small></td><td><v-chip :color="statusColor(item.status)" size="small" variant="tonal">{{ statusNames[item.status] }}</v-chip></td><td><v-btn variant="text" color="primary" append-icon="mdi-chevron-right" :to="{ path: '/alerts', query: { ...route.query, alertId: item.id } }" :aria-label="`Xem cảnh báo ${item.title} tại ${item.tank?.name || 'ao/bể'}`">Chi tiết</v-btn></td></tr></tbody></v-table></div>
          <Pagination v-model:page="page" v-model:page-size="pageSize" :total="total" :loading="loading" />
        </section>
        <p class="list-note"><v-icon icon="mdi-information-outline" size="16" />Đọc cảnh báo không đồng nghĩa đã xử lý. Chỉ người được giao và đã nhận việc mới được cập nhật kết quả.</p>
      </template>
    </section>
  </AppShell>
</template>

<style scoped>
.alerts-page{display:grid;gap:24px;color:#203d37;min-width:0}.page-header{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}.page-header h1{font-size:29px;line-height:1.3;letter-spacing:-.6px;font-weight:700;margin:0}.page-header p:not(.eyebrow){margin-top:10px;color:#6b8078;font-size:13px;line-height:1.7}.eyebrow{font-size:10px;font-weight:700;letter-spacing:1.8px;color:#087f6e;margin:0 0 10px}.surface{background:#fff;border:1px solid #dfe8e2;border-radius:13px;overflow:hidden}.summary-strip{display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;border:1px solid #dfe8e2;border-radius:13px;background:#fff;overflow:hidden}.summary-item{display:grid;gap:10px;padding:23px 25px;position:relative}.summary-item+.summary-item:before{content:'';position:absolute;left:0;top:28px;bottom:28px;width:1px;background:#e4ebe5}.summary-item.highlight{background:#eaf3ed}.summary-item span{display:flex;gap:8px;align-items:center;font-size:12px;color:#667f73}.summary-item strong{font-size:30px;line-height:1;font-weight:650}.summary-item small{font-size:11px;color:#73877c}.danger{color:#bf4651}.warning{color:#a06b22}.list-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:23px 23px 8px}.list-heading h2,.card-heading h2{font-size:15px;font-weight:650;margin:0}.list-heading>small{font-size:11px;color:#7b8c83}.count{display:inline-block;font-size:11px;line-height:1;padding:4px 6px;background:#edf2ed;border:1px solid #e2e9e2;border-radius:4px;margin-left:7px;color:#637b6c;font-weight:500}.status-tabs{padding:0 23px;border-bottom:1px solid #e4ebe5}.status-tabs :deep(.v-tab){font-size:12px;text-transform:none;min-width:0;letter-spacing:0}.filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;padding:20px 23px;background:#fff;border-bottom:1px solid #e4ebe5}.filters :deep(.v-field){font-size:12px;background:#f8faf7}.table-wrap{overflow-x:auto;max-width:100%}.alerts-table{min-width:900px}.message-cell{min-width:240px;max-width:420px}.alert-label{display:flex;align-items:center;gap:13px}.alert-symbol{display:grid;place-items:center;width:35px;height:35px;border-radius:9px;background:#fcf5e9;color:#a06b22;flex-shrink:0}.alert-symbol.critical{background:#fcf0ee;color:#c4444b}.read-label{color:#087f6e}.unread strong{font-weight:700}.person{display:flex;gap:9px;align-items:center;font-size:12px;white-space:nowrap}.person :deep(.v-avatar){font-size:9px;font-weight:650}.empty{text-align:center;padding:48px 20px;color:#70867b}.empty h3{font-size:15px;color:#203d37;margin:13px 0 6px}.empty p{font-size:12px}.list-note,.scope-note{display:flex;align-items:flex-start;gap:8px;font-size:11px;line-height:1.8;color:#75887f}.list-note{margin:0}.detail-navigation{display:flex;align-items:center;justify-content:space-between;gap:12px}.detail-navigation :deep(.v-btn){padding-left:0;font-size:12px;text-transform:none}.detail-navigation>span{font-size:11px;color:#809087}.heading-badges{display:flex;gap:8px;flex-wrap:wrap}.detail-layout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,1fr);gap:24px;align-items:start}.detail-column{display:grid;gap:22px;min-width:0}.detail-card{padding:25px}.card-heading{display:flex;align-items:center;gap:10px;margin-bottom:20px}.detail-message{font-size:13px;color:#657b6e;line-height:1.8;overflow-wrap:anywhere}.measurement{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px;border:1px solid #ebdfc6;border-radius:11px;background:#fcf7ed;margin:22px 0;color:#9f6a20}.measurement.critical{color:#b44d4f;background:#fcf1ee;border-color:#eddbd6}.measurement span{display:block;font-size:10px;letter-spacing:.5px;margin-bottom:10px}.measurement strong{font-size:37px;line-height:1.1;letter-spacing:-1px}.measurement strong small{font-size:14px;font-weight:500;letter-spacing:0}.optimal{text-align:right}.optimal b{font-size:14px;font-weight:600}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 20px;margin:25px 0}.detail-grid dt{font-size:11px;color:#7a8b80;line-height:1.6}.detail-grid dd{font-size:13px;line-height:1.7;font-weight:550;margin:5px 0 0;overflow-wrap:anywhere}.detail-grid small,.assignee-card small{display:block;font-size:11px;color:#788a80;font-weight:400}.assignee-card{display:flex;gap:12px;align-items:center;padding:16px;background:#f7f9f5;border:1px solid #e2e9dd;border-radius:9px}.assignee-card strong{font-size:13px;font-weight:600;overflow-wrap:anywhere}.assignee-card small{margin-top:5px}.assignment-meta{gap:16px;font-size:12px}.assignment-form{margin-top:18px}.helper{font-size:12px;line-height:1.8;color:#75857c;margin-top:18px}.scope-note{padding:13px;background:#f3f7ef;border-radius:8px;margin:18px 0 0;color:#627650}.handling-summary{padding:16px;border-radius:9px;background:#eef5ef;color:#3c6251;font-size:12px;line-height:1.8}.handling-summary p{margin:5px 0 0}.notes{white-space:pre-wrap;overflow-wrap:anywhere}.muted{color:#75867c;font-size:13px;line-height:1.8}.handling-form{margin-top:24px}.workflow{padding:5px 16px}.workflow h2{font-size:14px;font-weight:650}.workflow>div{display:flex;gap:12px;align-items:flex-start;margin-top:22px}.workflow b{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;background:#e9f1e9;color:#087f6e;font-size:11px;flex-shrink:0}.workflow p{margin:0}.workflow strong{display:block;font-size:12px;font-weight:600}.workflow small{display:block;font-size:11px;line-height:1.8;color:#788a7e;margin-top:3px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:1100px){.detail-layout{grid-template-columns:1fr}.summary-item{padding:22px 18px}.filters{grid-template-columns:repeat(3,minmax(0,1fr))}.detail-column{gap:20px}}
@media(max-width:650px){.alerts-page{gap:20px}.page-header h1{font-size:25px}.summary-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.summary-item{padding:20px 16px;gap:9px}.summary-item:nth-child(n+3){border-top:1px solid #e4ebe5}.summary-item:nth-child(3):before{display:none}.summary-item strong{font-size:27px}.summary-item small{font-size:10px}.list-heading{padding:19px 16px 6px}.list-heading>small{display:none}.status-tabs{padding:0 10px}.filters{padding:18px 16px;grid-template-columns:repeat(2,minmax(0,1fr))}.filters>:last-child{grid-column:1/-1}.detail-card{padding:21px 18px}.detail-grid{gap:20px 16px}.detail-navigation>span{display:none}.measurement{padding:18px 14px;flex-wrap:wrap}.measurement strong{font-size:32px}.optimal{text-align:left}.detail-card :deep(.v-btn){max-width:100%;height:auto;min-height:40px;padding-top:10px;padding-bottom:10px}.detail-card :deep(.v-btn__content){white-space:normal;text-align:left}.list-note{font-size:10px}.workflow{padding:0 4px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style>
