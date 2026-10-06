<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { logout, useAuth } from '../../composables/auth.js'
import { loadFarmContext, selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'

const auth = useAuth()
const farmContext = useFarmContext()
const router = useRouter()
const { mobile } = useDisplay()
const signingOut = ref(false)
const drawer = ref(!mobile.value)
const sidebarMode = ref(localStorage.getItem('sidebarMode') || 'expanded')
const initials = computed(() => (auth.user?.displayName || auth.user?.email || 'U').trim().slice(0, 2).toUpperCase())
const selectedFarm = computed(() => farmContext.farms.find((farm) => farm.id === farmContext.farmId))
const role = computed(() => selectedFarm.value?.role)
const canViewPondTanks = computed(() => ['owner', 'area_manager', 'technician'].includes(role.value))
const canViewSeedSuppliers = computed(() => ['owner', 'area_manager'].includes(role.value))
const canViewSeedBatches = computed(() => ['owner', 'area_manager', 'technician'].includes(role.value))
const canViewCareLogs = computed(() => ['owner', 'area_manager', 'technician'].includes(role.value))
const canViewInventory = computed(() => ['owner', 'warehouse_staff', 'area_manager', 'technician'].includes(role.value))
const canViewInventoryRequests = computed(() => ['owner', 'warehouse_staff', 'area_manager'].includes(role.value))
const canRecordInventoryUsage = computed(() => ['owner', 'technician'].includes(role.value))

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
  <v-layout class="app-shell">
    <v-app-bar height="76" elevation="0" border="b" class="px-3">
      <v-app-bar-nav-icon v-if="mobile" aria-label="Mở điều hướng" @click="drawer = !drawer" />
      <v-avatar color="primary" rounded="lg" size="38" class="mr-3">CS</v-avatar>
      <v-app-bar-title class="brand-title">ChillShrimp<small>Farm Management</small></v-app-bar-title>
      <v-select
        v-if="farmContext.farms.length > 1"
        class="navbar-farm-select"
        aria-label="Trại đang làm việc"
        :model-value="farmContext.farmId"
        :items="farmContext.farms"
        item-title="name"
        item-value="id"
        density="compact"
        hide-details
        @update:model-value="selectFarm"
      />
      <v-chip v-else-if="selectedFarm" class="mr-3" color="primary" prepend-icon="mdi-home-outline">
        {{ selectedFarm.name }}
      </v-chip>
      <v-menu location="bottom end" :offset="10">
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="text" height="52" aria-label="Mở menu tài khoản" append-icon="mdi-chevron-down">
            <v-avatar color="primary" variant="tonal" rounded="lg" size="38">{{ initials }}</v-avatar>
            <span v-if="!mobile" class="user-copy ml-3">
              <strong>{{ auth.user?.displayName || 'Người dùng' }}</strong>
              <small>{{ auth.user?.email }}</small>
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
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      color="primary"
      :temporary="mobile"
      :permanent="!mobile"
      :rail="!mobile && sidebarMode === 'collapsed'"
      :expand-on-hover="!mobile && sidebarMode === 'collapsed'"
      :width="250"
      :rail-width="72"
    >
      <v-list nav class="sidebar-links pa-3" aria-label="Điều hướng chính">
        <v-list-item to="/dashboard" prepend-icon="mdi-view-dashboard-outline" title="Dashboard" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item to="/users" prepend-icon="mdi-account-group-outline" title="Người dùng" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item to="/farms" prepend-icon="mdi-home-city-outline" title="Trang trại" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewPondTanks" to="/ponds-tanks" prepend-icon="mdi-waves" title="Ao/bể" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewSeedSuppliers" to="/seed-suppliers" prepend-icon="mdi-truck-outline" title="Nhà cung cấp giống" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewSeedBatches" to="/seed-batches" prepend-icon="mdi-fishbowl" title="Lô giống" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewCareLogs" to="/feeding-logs" prepend-icon="mdi-food-drumstick-outline" title="Nhật ký cho ăn" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewCareLogs" to="/water-change-logs" prepend-icon="mdi-water-sync" title="Nhật ký thay nước" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewCareLogs" to="/water-parameter-logs" prepend-icon="mdi-water-thermometer-outline" title="Môi trường nước" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewCareLogs" to="/environment-thresholds" prepend-icon="mdi-chart-bell-curve-cumulative" title="Ngưỡng môi trường" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewCareLogs" to="/treatment-logs" prepend-icon="mdi-flask-outline" title="Nhật ký thuốc/chế phẩm" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewInventory" to="/inventory-supplies" prepend-icon="mdi-archive-outline" title="Danh mục vật tư" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canViewInventoryRequests" to="/inventory-requests" prepend-icon="mdi-clipboard-list-outline" title="Yêu cầu cấp vật tư" rounded="lg" @click="closeMobileDrawer" />
        <v-list-item v-if="canRecordInventoryUsage" to="/inventory-usage" prepend-icon="mdi-package-variant-minus" title="Ghi nhận sử dụng" rounded="lg" @click="closeMobileDrawer" />
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
.app-shell { height: 100vh; height: 100dvh; flex: none; overflow: hidden; color: #134e4a; background: #f0fdfa; }
.app-shell :deep(.v-main__scroller) { min-height: 0; overscroll-behavior-y: contain; scrollbar-gutter: stable; }
.app-shell :deep(.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .sidebar-links .v-list-item) {
  grid-template-columns: 1fr;
  grid-template-areas: "prepend";
  justify-items: center;
  padding-inline: 0;
}
.app-shell :deep(.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .sidebar-links .v-list-item__spacer),
.app-shell :deep(.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .sidebar-links .v-list-item__content),
.app-shell :deep(.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .sidebar-links .v-list-item__append) { display: none; }
.brand-title { color: #134e4a; font-size: 16px; font-weight: 700; }
.brand-title small { display: block; color: #80918e; font-size: 10px; font-weight: 400; }
.navbar-farm-select { flex: 0 1 230px; min-width: 120px; margin-right: 16px; }
.user-copy { text-align: left; text-transform: none; letter-spacing: normal; }
.user-copy strong, .user-copy small { display: block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
.user-copy small { color: #82908e; font-size: 11px; }
.main-content { max-width: 1240px; padding: 20px 38px 60px; }
@media (max-width: 760px) { .main-content { padding: 16px 16px 44px; } .brand-title { display: none; } .navbar-farm-select { margin-right: 4px; } }
</style>
