<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Pagination from '../pagination/index.vue'
import { useAuth } from '../../composables/auth.js'
import { useFarmContext } from '../../composables/farm-context.js'
import { api } from '../../services/api.js'
const context = useFarmContext()
const auth = useAuth()
const router = useRouter()
const role = computed(() => context.farms.find(farm => farm.id === context.farmId)?.role)
const allowed = computed(() => Boolean(auth.user?.id) && ['owner', 'farm_manager', 'area_manager', 'technician'].includes(role.value))
const items = ref([]), unreadCount = ref(0), error = ref(''), loading = ref(false)
const personalItems = ref([]), personalUnreadCount = ref(0), personalError = ref(''), personalLoading = ref(false)
const personalPage = ref(1), personalTotal = ref(0), reading = ref(false), readError = ref('')
const menuOpen = ref(false), tab = ref('system')
const totalUnread = computed(() => unreadCount.value + personalUnreadCount.value)
const hasError = computed(() => Boolean(error.value || personalError.value || readError.value))
let controller, personalController, readController, timer
const root = () => `/farms/${encodeURIComponent(context.farmId)}/environment-thresholds`
async function refreshSystem() {
  controller?.abort(); const current = controller = new AbortController()
  if (!allowed.value || !context.farmId) return
  loading.value = true
  try {
    const result = await api(`${root()}/alerts?isRead=false&limit=5`, { signal: current.signal })
    if (current.signal.aborted) return
    items.value = result.data.items; unreadCount.value = result.data.unreadCount; error.value = ''
  } catch (err) { if (!current.signal.aborted) error.value = err.message }
  finally { if (!current.signal.aborted) loading.value = false }
}
async function refreshPersonal() {
  personalController?.abort(); const current = personalController = new AbortController()
  if (!allowed.value || !context.farmId || !auth.user?.id) return
  personalLoading.value = true
  try {
    const result = await api(`${root()}/notifications?page=${personalPage.value}&limit=5`, { signal: current.signal })
    if (current.signal.aborted) return
    personalTotal.value = result.data.pagination.total
    const last = Math.max(1, Math.ceil(personalTotal.value / 5))
    if (personalPage.value > last) { personalPage.value = last; return }
    personalItems.value = result.data.items; personalUnreadCount.value = result.data.unreadCount; personalError.value = ''
  } catch (err) { if (!current.signal.aborted) personalError.value = err.message }
  finally { if (!current.signal.aborted) personalLoading.value = false }
}
async function refresh() { await Promise.all([refreshSystem(), refreshPersonal()]) }
async function openPersonal(item) {
  if (reading.value || !allowed.value || !auth.user?.id) return
  readController?.abort(); const current = readController = new AbortController()
  reading.value = true; readError.value = ''
  try {
    const result = await api(`${root()}/notifications/${encodeURIComponent(item.id)}/read`, { method: 'PATCH', signal: current.signal })
    if (current.signal.aborted) return
    const wasUnread = !item.isRead
    Object.assign(item, result.data)
    if (wasUnread) personalUnreadCount.value = Math.max(0, personalUnreadCount.value - 1)
    window.dispatchEvent(new Event('alerts:refresh'))
    if (current.signal.aborted) return
    await router.push({ path: '/alerts', query: { alertId: item.alertId || item.alert?.id } })
    if (!current.signal.aborted) menuOpen.value = false
  } catch (err) { if (!current.signal.aborted) readError.value = err.message }
  finally { if (!current.signal.aborted) reading.value = false }
}
function refreshVisible() { if (!document.hidden) refresh() }
watch([() => context.farmId, () => role.value, () => context.farms.find(farm => farm.id === context.farmId)?.area?.id, () => auth.user?.id], () => {
  controller?.abort(); personalController?.abort(); readController?.abort()
  items.value = []; unreadCount.value = 0; error.value = ''; loading.value = false
  personalItems.value = []; personalUnreadCount.value = 0; personalTotal.value = 0; personalError.value = ''; personalLoading.value = false
  readError.value = ''; reading.value = false; menuOpen.value = false; personalPage.value = 1; tab.value = 'system'
  refresh()
}, { immediate: true, flush: 'sync' })
watch(personalPage, refreshPersonal)
onMounted(() => {
  timer = setInterval(refreshVisible, 30000)
  window.addEventListener('alerts:refresh', refresh)
  document.addEventListener('visibilitychange', refreshVisible)
})
onBeforeUnmount(() => {
  controller?.abort(); personalController?.abort(); readController?.abort(); clearInterval(timer)
  window.removeEventListener('alerts:refresh', refresh)
  document.removeEventListener('visibilitychange', refreshVisible)
})
</script>

<template>
  <v-menu v-if="allowed" v-model="menuOpen" location="bottom end" :offset="10" :close-on-content-click="false" @update:model-value="open => open && refresh()">
    <template #activator="{ props }"><v-btn v-bind="props" icon variant="text" :aria-label="`Thông báo: ${totalUnread} chưa đọc${hasError ? ', có lỗi tải thông báo' : ''}`"><v-badge :model-value="totalUnread > 0 || hasError" :content="hasError ? '!' : totalUnread > 99 ? '99+' : totalUnread" color="error"><v-icon icon="mdi-bell-outline" /></v-badge></v-btn></template>
    <v-card class="alert-menu" width="420">
      <v-tabs v-model="tab" color="primary" grow aria-label="Loại thông báo"><v-tab value="system">Hệ thống ({{ unreadCount }})</v-tab><v-tab value="personal">Cá nhân ({{ personalUnreadCount }})</v-tab></v-tabs>
      <section v-if="tab === 'system'" aria-label="Thông báo hệ thống">
        <v-progress-linear v-if="loading" indeterminate aria-label="Đang tải thông báo hệ thống" />
        <div v-if="error" class="pa-4" role="alert"><p>{{ error }}</p><v-btn variant="text" @click="refreshSystem">Thử lại</v-btn></div>
        <v-list v-else-if="items.length" lines="three"><v-list-item v-for="item in items" :key="item.id" :to="{ path: '/alerts', query: { alertId: item.id } }" :title="item.title" :subtitle="item.message" @click="menuOpen = false"><template #prepend><v-icon :icon="item.severity === 'critical' ? 'mdi-alert-octagon-outline' : 'mdi-alert-outline'" :color="item.severity === 'critical' ? 'error' : 'warning'" class="mr-3" /></template></v-list-item></v-list>
        <p v-else-if="!loading" class="pa-4">Không có cảnh báo chưa đọc.</p>
        <v-divider /><v-card-actions><v-btn to="/alerts" color="primary" block @click="menuOpen = false">Xem tất cả cảnh báo</v-btn></v-card-actions>
      </section>
      <section v-else aria-label="Thông báo cá nhân">
        <v-progress-linear v-if="personalLoading || reading" indeterminate aria-label="Đang tải thông báo cá nhân" />
        <div v-if="personalError" class="pa-4" role="alert"><p>{{ personalError }}</p><v-btn variant="text" @click="refreshPersonal">Thử lại</v-btn></div>
        <v-alert v-if="readError" type="error" variant="tonal" class="ma-3">{{ readError }} Bấm thông báo để thử lại.</v-alert>
        <v-list v-if="!personalError && personalItems.length" lines="three"><v-list-item v-for="item in personalItems" :key="item.id" :title="item.title" :subtitle="item.message" :disabled="reading" :class="{ unread: !item.isRead }" @click="openPersonal(item)"><template #prepend><v-icon icon="mdi-account-alert-outline" color="primary" class="mr-3" /></template><template #append><small>{{ item.isRead ? 'Đã đọc' : 'Chưa đọc' }}</small></template></v-list-item></v-list>
        <p v-else-if="!personalError && !personalLoading" class="pa-4">Chưa có thông báo cá nhân.</p>
        <Pagination v-model:page="personalPage" :page-size="5" :sizes="[5]" :total="personalTotal" :loading="personalLoading || reading" />
      </section>
    </v-card>
  </v-menu>
</template>
<style scoped>
.alert-menu{max-width:calc(100vw - 24px);max-height:calc(100svh - 96px);overflow-y:auto}.alert-menu p{margin:0}.unread{background:#f0f8f5}.alert-menu small{font-size:10px;color:#526963}.alert-menu :deep(.v-list-item-subtitle){white-space:normal}
</style>
