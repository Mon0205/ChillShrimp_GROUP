<script setup>
import AlertBell from '../alerts/AlertBell.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { logout, useAuth } from '../../composables/auth.js'
import { loadFarmContext, selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'

const auth = useAuth()
const farmContext = useFarmContext()
const router = useRouter()
const route = useRoute()
const { width } = useDisplay()
const mobile = computed(() => width.value <= 1000)
const signingOut = ref(false)
const drawer = ref(!mobile.value)
const sidebarMode = ref(localStorage.getItem('sidebarMode') || 'expanded')
watch(mobile, value => { drawer.value = !value })
const initials = computed(() => (auth.user?.displayName || auth.user?.email || 'U').trim().slice(0, 2).toUpperCase())
const selectedFarm = computed(() => farmContext.farms.find((farm) => farm.id === farmContext.farmId))
const role = computed(() => selectedFarm.value?.role)
const canViewSeedSuppliers = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER'].includes(role.value))
const canViewSeedBatches = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(role.value))
const canViewCareLogs = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(role.value))
const canViewInventory = computed(() => ['OWNER', 'FARM_MANAGER', 'WAREHOUSE_STAFF', 'AREA_MANAGER', 'TECHNICIAN'].includes(role.value))
// Warehouse staff have no dashboard; technicians and warehouse staff may not see the member list.
const canViewDashboard = computed(() => role.value !== 'WAREHOUSE_STAFF')
const canViewUsers = computed(() => !['TECHNICIAN', 'WAREHOUSE_STAFF'].includes(role.value))
const canViewFeedingReport = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(role.value))

onMounted(async () => {
  try { await loadFarmContext(true) }
  catch (error) { showToast(error.message, 'error') }
})

function setSidebarMode(mode) {
  sidebarMode.value = mode
  localStorage.setItem('sidebarMode', mode)
}

function closeMobileDrawer() {
  if (mobile.value) drawer.value = false
}

async function signOut() {
  signingOut.value = true
  try {
    await logout()
    await router.replace('/login')
  } catch (error) {
    showToast(error.message, 'error')
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <v-layout class="app-shell" :class="{ 'workspace-ledger': ['/inventory-supplies','/inventory-usage','/inventory-requests','/sales-orders','/customers','/sales-revenue','/seed-suppliers','/users','/farms'].includes(route.path), 'workspace-care': route.path === '/care-logs', 'workspace-production': route.path === '/seed-batches', 'workspace-quality': route.path === '/quality-checks', 'workspace-report': route.path === '/feeding-report', 'workspace-profile': route.path === '/profile' }">
    <v-app-bar height="66" elevation="0" border="b" class="workspace-topbar">
      <v-app-bar-nav-icon v-if="mobile" class="navbar-toggle" aria-label="Mở điều hướng" @click="drawer = !drawer" />
      <router-link class="navbar-brand" to="/dashboard" aria-label="ChillShrimp Dashboard"><span class="navbar-brand-mark"><img src="../../assets/login/logo.svg" alt="" width="32" height="32" /></span><span class="navbar-brand-copy">Chill<span>Shrimp</span></span></router-link>
      <v-spacer />
      <div class="topbar-actions">
      <v-select
        v-if="farmContext.farms.length > 1"
        class="navbar-farm-select"
        aria-label="Trại đang làm việc"
        :model-value="farmContext.farmId"
        :items="farmContext.farms"
        item-title="name"
        item-value="id"
        density="compact"
        variant="outlined"
        prepend-inner-icon="mdi-home-outline"
        menu-icon="mdi-chevron-down"
        hide-details
        @update:model-value="selectFarm"
      />
      <v-chip v-else-if="selectedFarm" class="current-farm" variant="flat" prepend-icon="mdi-home-outline">
        {{ selectedFarm.name }}
      </v-chip>
      <div class="navbar-notifications"><AlertBell /></div>
      <v-menu location="bottom end" :offset="10">
        <template #activator="{ props }">
          <v-btn v-bind="props" class="navbar-account" variant="text" height="44" aria-label="Mở menu tài khoản" :append-icon="mobile ? undefined : 'mdi-chevron-down'">
            <v-avatar color="primary" variant="tonal" size="34">{{ initials }}</v-avatar>
            <span v-if="!mobile" class="user-copy">
              <strong>{{ auth.user?.displayName || 'Người dùng' }}</strong>
            </span>
          </v-btn>
        </template>
        <v-list min-width="280" rounded="lg">
          <v-list-item :title="auth.user?.displayName || 'Người dùng'" :subtitle="auth.user?.email" />
          <v-divider class="my-2" />
          <v-list-item to="/profile" prepend-icon="mdi-account-outline" title="Thông tin cá nhân" />
          <v-list-item
            prepend-icon="mdi-logout"
            :title="signingOut ? 'Đang đăng xuất...' : 'Đăng xuất'"
            :disabled="signingOut"
            base-color="error"
            @click="signOut"
          />
        </v-list>
      </v-menu>
      </div>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      class="workspace-sidebar"
      color="#075e58"
      :order="1"
      :temporary="mobile"
      :permanent="!mobile"
      :rail="!mobile && sidebarMode === 'collapsed'"
      :expand-on-hover="!mobile && sidebarMode === 'collapsed'"
      :width="224"
      :rail-width="72"
      :open-delay="100"
      :close-delay="160"
    >
      <v-list nav class="sidebar-links pa-3" aria-label="Điều hướng chính">
        <v-list-item v-if="canViewDashboard" to="/dashboard" prepend-icon="mdi-view-dashboard-outline" title="Dashboard" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item to="/ponds-tanks" prepend-icon="mdi-fishbowl-outline" title="Khu vực & bể nuôi" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewSeedBatches" to="/seed-batches" prepend-icon="mdi-view-column-outline" title="Giai đoạn lô giống" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewCareLogs" to="/care-logs" prepend-icon="mdi-notebook-outline" title="Nhật kí chăm sóc" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewSeedBatches" to="/quality-checks" prepend-icon="mdi-flask-outline" title="Kiểm tra AI" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewInventory" to="/inventory-supplies" :active="['/inventory-supplies', '/inventory-requests', '/inventory-usage'].includes(route.path)" prepend-icon="mdi-archive-outline" title="Kho vật tư" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewSeedSuppliers" to="/sales-orders" :active="['/sales-orders', '/customers', '/sales-revenue'].includes(route.path)" prepend-icon="mdi-cart-outline" title="Khách hàng & đơn hàng" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewSeedSuppliers" to="/seed-suppliers" prepend-icon="mdi-truck-outline" title="Nhà cung cấp giống" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewFeedingReport" to="/feeding-report" prepend-icon="mdi-chart-bar" title="Báo cáo cho ăn" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item to="/farms" prepend-icon="mdi-home-city-outline" title="Trang trại" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewUsers" to="/users" prepend-icon="mdi-account-group-outline" title="Thành viên" rounded="lg" @click="closeMobileDrawer" />
      </v-list>
      <template #append>
        <v-menu location="top start" :offset="10">
          <template #activator="{ props }">
            <v-btn v-bind="props" class="ma-3" variant="text" icon="mdi-dock-left" aria-label="Chế độ hiển thị sidebar" />
          </template>
          <v-list rounded="lg">
            <v-list-item prepend-icon="mdi-dock-left" title="Hiển thị đầy đủ" :active="sidebarMode === 'expanded'" @click="setSidebarMode('expanded')" />
            <v-list-item prepend-icon="mdi-page-layout-sidebar-left" title="Thu gọn" :active="sidebarMode === 'collapsed'" @click="setSidebarMode('collapsed')" />
          </v-list>
        </v-menu>
      </template>
    </v-navigation-drawer>

    <v-main scrollable><v-container class="main-content"><slot /></v-container></v-main>
  </v-layout>
</template>

<style scoped>
.app-shell{height:100vh;height:100dvh;flex:none;overflow:hidden;color:#203e45;background:#f0f5f8;font-family:ChillWorkspaceManrope,'Segoe UI',sans-serif}
.workspace-sidebar.v-navigation-drawer--temporary{top:66px!important;height:calc(100% - 66px)!important}
.workspace-sidebar :deep(.v-navigation-drawer__content){scrollbar-width:none}.workspace-sidebar :deep(.v-navigation-drawer__content::-webkit-scrollbar){display:none}
.workspace-topbar{background:#fff!important}.app-shell :deep(.v-main__scroller){min-height:0;overscroll-behavior-y:contain;scrollbar-gutter:stable}
.sidebar-links{padding-top:18px!important}.sidebar-links :deep(.v-list-item){min-height:43px;margin-bottom:5px;border-radius:7px!important;color:#d5eae5}.sidebar-links :deep(.v-list-item-title){font-size:11px;font-weight:500;white-space:normal;line-height:1.55}.sidebar-links :deep(.v-list-item--active){color:white;background:#ffffff13;box-shadow:inset 3px 0 #82d9bf}.sidebar-links :deep(.v-list-item--active .v-list-item-title){font-weight:700}.sidebar-links :deep(.v-list-item__prepend .v-icon){font-size:18px;opacity:.85}.sidebar-links :deep(.v-list-item__spacer){width:12px}
.workspace-sidebar.v-navigation-drawer--rail :deep(.sidebar-links) {
  width: 224px;
}
.workspace-sidebar.v-navigation-drawer--rail :deep(.sidebar-links .v-list-item) {
  padding-inline-start: 15px;
}
.workspace-sidebar.v-navigation-drawer--rail :deep(.sidebar-links .v-list-item__content) {
  opacity: 0;
  transition: opacity 100ms ease;
}
.workspace-sidebar.v-navigation-drawer--rail.v-navigation-drawer--is-hovering :deep(.sidebar-links .v-list-item__content) {
  opacity: 1;
  transition-delay: 90ms;
}
.main-content{max-width:1500px;min-width:0;padding:28px 28px 45px}@media(max-width:760px){.main-content{padding:23px 16px 35px}.navbar-farm-select{margin-right:0;flex-basis:170px;min-width:100px}.current-farm{max-width:calc(100vw - 180px);font-size:11px}.workspace-topbar :deep(.v-toolbar__content){padding-inline:0}.sidebar-links :deep(.v-list-item-title){font-size:12px}}

.workspace-topbar{border-bottom:1px solid #dce7e7!important;box-shadow:0 2px 12px #16433c04!important}
.workspace-topbar :deep(.v-toolbar__content){padding-inline:22px;gap:12px}
.navbar-brand{display:flex;align-items:center;gap:10px;flex-shrink:0;text-decoration:none;min-width:190px}
.navbar-brand-mark{display:grid;place-items:center;width:38px;height:38px;background:#075e58;border-radius:12px;box-shadow:0 3px 8px #075e581a}
.navbar-brand-copy{color:#154c46;font-size:21px;font-weight:750;letter-spacing:-.8px}.navbar-brand-copy>span{font-weight:500;color:#428579}
.topbar-actions{display:flex;align-items:center;gap:12px;min-width:0;max-width:70%}
.navbar-farm-select{width:228px;flex:0 1 228px;min-width:120px;font-size:12px}
.navbar-farm-select :deep(.v-field){border-radius:10px;background:#f4f8f7;color:#235b51;font-size:12px;--v-field-padding-start:12px;--v-field-padding-end:10px}
.navbar-farm-select :deep(.v-field__outline){--v-field-border-opacity:.12}.navbar-farm-select :deep(.v-field__prepend-inner .v-icon){font-size:19px;opacity:.8}.navbar-farm-select :deep(.v-field__input){min-height:42px;padding-block:9px}
.current-farm{height:42px!important;padding-inline:13px!important;border:1px solid #e1ebe7;border-radius:10px!important;background:#f4f8f7!important;color:#285d52;font-size:12px;font-weight:600;max-width:260px;min-width:0}.current-farm :deep(.v-chip__content){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.current-farm :deep(.v-icon){font-size:19px}
.navbar-notifications{flex-shrink:0;display:flex;align-items:center}.navbar-notifications :deep(.v-btn){width:42px;height:42px;border-radius:10px;color:#416a62;background:#f4f8f7}
.navbar-account{padding-inline:12px 4px!important;border-left:1px solid #e1e9e6;border-radius:0!important;min-width:0!important;color:#284c46!important;letter-spacing:0;text-transform:none;flex-shrink:0}.navbar-account :deep(.v-btn__content){gap:10px}.navbar-account :deep(.v-btn__append){margin-inline:12px 0;font-size:13px;color:#79948c}.navbar-account :deep(.v-avatar){background:#e2eee8!important;color:#216451!important;font-size:11px;font-weight:700}.user-copy{font-size:12px;max-width:135px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.user-copy strong{font-weight:600}
.navbar-brand:focus-visible{outline:2px solid #167b69;outline-offset:4px;border-radius:8px}
@media(max-width:1000px){.workspace-topbar :deep(.v-toolbar__content){padding-inline:12px;gap:8px}.navbar-brand{min-width:0}.navbar-toggle{margin-inline:0!important;width:40px;height:40px}.topbar-actions{gap:8px;max-width:70%}.navbar-account{border:0;padding:0!important;width:42px}.navbar-farm-select{width:200px}.current-farm{max-width:210px}}
@media(max-width:600px){.workspace-topbar :deep(.v-toolbar__content){padding-inline:8px;gap:4px}.navbar-brand{gap:0}.navbar-brand-copy{display:none}.navbar-brand-mark{width:34px;height:34px;border-radius:10px}.navbar-brand-mark img{width:29px;height:29px}.topbar-actions{gap:6px;max-width:calc(100% - 86px)}.navbar-farm-select{width:145px;min-width:85px;flex-basis:145px}.navbar-farm-select :deep(.v-field__prepend-inner){display:none}.navbar-farm-select :deep(.v-field){font-size:11px;--v-field-padding-start:9px}.current-farm{max-width:145px;font-size:11px;padding-inline:9px!important}.current-farm :deep(.v-chip__prepend){display:none}.navbar-notifications :deep(.v-btn),.navbar-account{width:40px!important;min-width:40px!important}.user-copy{display:none}}
</style>
