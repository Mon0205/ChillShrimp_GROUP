<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logout, useAuth } from '../../composables/auth.js'
import { loadFarmContext, selectFarm, useFarmContext } from '../../composables/farm-context.js'

const auth = useAuth()
const farmContext = useFarmContext()
const route = useRoute()
const router = useRouter()
const signingOut = ref(false)
const sidebarMode = ref(localStorage.getItem('sidebarMode') || 'expanded')
const modeMenu = ref(false)
let closeModeTimer
const initials = computed(() => (auth.user?.displayName || auth.user?.email || 'U').trim().slice(0, 2).toUpperCase())
const selectedFarm = computed(() => farmContext.farms.find((farm) => farm.id === farmContext.farmId))
const isOwner = computed(() => farmContext.farms.some((farm) => farm.role === 'owner'))
onMounted(() => loadFarmContext(true))

function setSidebarMode(mode) {
  sidebarMode.value = mode
  localStorage.setItem('sidebarMode', mode)
  modeMenu.value = false
}

function scheduleModeMenuClose() {
  clearTimeout(closeModeTimer)
  closeModeTimer = setTimeout(() => { modeMenu.value = false }, 180)
}
function keepModeMenuOpen() { clearTimeout(closeModeTimer) }

async function signOut() {
  signingOut.value = true
  try { await logout(); await router.replace('/login') }
  finally { signingOut.value = false }
}
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': sidebarMode === 'collapsed' }">
    <aside class="sidebar" :class="{ collapsed: sidebarMode === 'collapsed' }" @mouseleave="scheduleModeMenuClose" @mouseenter="keepModeMenuOpen">
      <nav class="sidebar-nav" aria-label="Điều hướng chính">
        <RouterLink class="nav-item" :class="{ active: route.path === '/dashboard' }" to="/dashboard">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <span class="nav-label">Người dùng</span>
        </RouterLink>
      </nav>
      <v-menu v-model="modeMenu" location="top start" :offset="10">
        <template #activator="{ props }"><button v-bind="props" class="sidebar-mode-btn" type="button" title="Chế độ hiển thị sidebar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/><path d="m15 9 3 3-3 3"/></svg></button></template>
        <v-card class="sidebar-mode-menu" elevation="8" @mouseenter="keepModeMenuOpen" @mouseleave="scheduleModeMenuClose">
          <button type="button" :class="{ active: sidebarMode === 'expanded' }" @click="setSidebarMode('expanded')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg><span>Hiển thị đầy đủ</span><span class="mode-check">✓</span></button>
          <button type="button" :class="{ active: sidebarMode === 'collapsed' }" @click="setSidebarMode('collapsed')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 4v16"/></svg><span>Thu gọn</span><span class="mode-check">✓</span></button>
        </v-card>
      </v-menu>
    </aside>

    <section class="workspace">
      <header class="app-header">
        <div class="navbar-brand"><span class="brand-symbol">CS</span><div><strong>ChillShrimp</strong><small>Farm Management</small></div></div>
        <div v-if="farmContext.farms.length && isOwner" class="navbar-farm-select">
          <v-select :model-value="farmContext.farmId" :items="farmContext.farms" item-title="name" item-value="id" density="compact" variant="outlined" hide-details @update:model-value="selectFarm" />
        </div>
        <div v-else-if="selectedFarm" class="navbar-farm-badge" title="Trại đang làm việc">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-7h6v7"/></svg><span>{{ selectedFarm.name }}</span>
        </div>
        <v-menu location="bottom end" :offset="10">
          <template #activator="{ props }">
            <button v-bind="props" class="account-trigger" type="button" aria-label="Mở menu tài khoản">
              <div class="user-avatar">{{ initials }}</div>
              <div class="user-copy"><strong>{{ auth.user?.displayName || 'Người dùng' }}</strong><small>{{ auth.user?.email }}</small></div>
              <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 10 5 5 5-5" /></svg>
            </button>
          </template>
          <v-card class="account-menu" elevation="8">
            <div class="menu-account"><div class="user-avatar">{{ initials }}</div><div class="user-copy"><strong>{{ auth.user?.displayName || 'Người dùng' }}</strong><small>{{ auth.user?.email }}</small></div></div>
            <div class="menu-divider" />
            <RouterLink class="menu-item" to="/profile">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
              <span>Thông tin cá nhân</span>
            </RouterLink>
            <button class="menu-item logout-item" type="button" :disabled="signingOut" @click="signOut">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>
              <span>{{ signingOut ? 'Đang đăng xuất...' : 'Đăng xuất' }}</span>
            </button>
          </v-card>
        </v-menu>
      </header>
      <main class="main-content"><slot /></main>
    </section>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
.app-shell { min-height: 100vh; display: flex; padding-top: 76px; color: #134e4a; background: #f0fdfa; font-family: Manrope, Inter, system-ui, sans-serif; }
.app-shell, .app-shell * { box-sizing: border-box; }
.brand-symbol { width: 38px; height: 38px; flex: 0 0 38px; display: grid; place-items: center; border-radius: 11px; color: white; background: #087f6e; font-size: 12px; font-weight: 800; box-shadow: 0 7px 18px rgba(8,127,110,.22); }
.sidebar { position: fixed; inset: 76px auto 0 0; z-index: 10; width: 250px; display: flex; flex-direction: column; padding: 20px 14px 16px; overflow: hidden; color: white; background: #087f6e; box-shadow: 8px 0 24px rgba(8,80,70,.08); transition: width .22s ease, padding .22s ease; }
.sidebar.collapsed { width: 72px; padding-inline: 10px; }
.sidebar.collapsed:hover { width: 250px; padding-inline: 14px; box-shadow: 12px 0 30px rgba(8,80,70,.2); }
.sidebar.collapsed:not(:hover) .nav-item { width: 48px; height: 48px; justify-content: center; gap: 0; padding: 9px; margin-inline: auto; }
.sidebar-nav { display: grid; gap: 8px; }
.nav-item { padding: 13px 14px; display: flex; align-items: center; gap: 11px; border-radius: 12px; color: #e8fffa; text-decoration: none; font-size: 13px; font-weight: 600; }
.nav-item.active, .nav-item:hover { color: white; background: #06685b; }
.nav-icon { width: 30px; height: 30px; flex: 0 0 30px; display: grid; place-items: center; border-radius: 9px; background: rgba(255,255,255,.12); }
.nav-icon svg { width: 18px; height: 18px; }
.nav-item.active .nav-icon { background: rgba(255,255,255,.18); }
.nav-label { overflow: hidden; opacity: 1; white-space: nowrap; transition: opacity .15s ease; }
.sidebar.collapsed:not(:hover) .nav-label { width: 0; opacity: 0; }
.sidebar-mode-btn { width: 48px; height: 48px; flex: 0 0 48px; display: grid; place-items: center; padding: 0; margin: auto 0 0; border: 0; border-radius: 10px; color: #e8fffa; background: transparent; cursor: pointer; }
.sidebar-mode-btn:hover,.sidebar-mode-btn[aria-expanded="true"] { background: rgba(255,255,255,.1); }
.sidebar.collapsed:not(:hover) .sidebar-mode-btn { margin-left: auto; margin-right: auto; }
.sidebar-mode-btn svg { width: 20px; height: 20px; flex: 0 0 20px; transition: transform .2s ease; }
.sidebar-mode-menu { width: 210px; padding: 7px; border: 1px solid #dce7e4; border-radius: 13px !important; }
.sidebar-mode-menu button { width: 100%; height: 42px; display: grid; grid-template-columns: 21px 1fr 18px; align-items: center; gap: 9px; padding: 0 10px; border: 0; border-radius: 9px; color: #49615d; background: transparent; font: 600 12px Manrope,sans-serif; text-align: left; cursor: pointer; }
.sidebar-mode-menu button:hover,.sidebar-mode-menu button.active { color: #087f6e; background: #edf8f5; }
.sidebar-mode-menu button svg { width: 19px; height: 19px; }.mode-check { opacity: 0; font-weight: 800; }.sidebar-mode-menu button.active .mode-check { opacity: 1; }
.workspace { width: calc(100% - 250px); min-height: calc(100vh - 76px); margin-left: 250px; transition: width .22s ease, margin-left .22s ease; }
.sidebar-collapsed .workspace { width: calc(100% - 72px); margin-left: 72px; }
.app-header { height: 76px; position: fixed; inset: 0 0 auto 0; z-index: 20; display: flex; align-items: center; justify-content: flex-end; padding: 0 38px 0 22px; border-bottom: 1px solid #dee8e5; background: rgba(255,255,255,.96); backdrop-filter: blur(14px); }
.navbar-brand { display: flex; align-items: center; gap: 11px; margin-right: auto; }
.navbar-brand strong,.navbar-brand small { display: block; }
.navbar-brand strong { color: #134e4a; font-size: 14px; }
.navbar-brand small { margin-top: 1px; color: #80918e; font-size: 9px; }
.navbar-farm-select { width: 230px; margin-right: 18px; }
.navbar-farm-select :deep(.v-field) { min-height: 40px; border-radius: 10px; background: white; }
.navbar-farm-badge { max-width: 240px; min-height: 39px; display: flex; align-items: center; gap: 8px; padding: 0 13px; margin-right: 18px; border: 1px solid #cfe4df; border-radius: 11px; color: #087f6e; background: #edf8f5; font-size: 11px; font-weight: 700; }
.navbar-farm-badge svg { width: 17px; height: 17px; flex: 0 0 17px; }
.navbar-farm-badge span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-trigger { display: flex; align-items: center; gap: 11px; padding: 6px 9px; border: 0; border-radius: 12px; color: inherit; background: transparent; text-align: left; cursor: pointer; }
.account-trigger:hover, .account-trigger[aria-expanded="true"] { background: #edf8f5; }
.chevron { width: 16px; height: 16px; color: #738581; transition: transform .2s ease; }
.account-trigger[aria-expanded="true"] .chevron { transform: rotate(180deg); }
.user-avatar { width: 39px; height: 39px; display: grid; place-items: center; border-radius: 12px; color: #087f6e; background: #e3f3ef; font-size: 12px; font-weight: 800; }
.user-copy { min-width: 150px; }
.user-copy strong, .user-copy small { display: block; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-copy strong { color: #214641; font-size: 12px; }
.user-copy small { color: #82908e; font-size: 10px; margin-top: 2px; }
.account-menu { width: 285px; padding: 10px; border: 1px solid #dce7e4; border-radius: 16px !important; }
.menu-account { display: flex; align-items: center; gap: 11px; padding: 9px; }
.menu-divider { height: 1px; margin: 7px 4px; background: #e6eeec; }
.menu-item { width: 100%; min-height: 43px; display: flex; align-items: center; gap: 11px; padding: 0 12px; border: 0; border-radius: 10px; color: #315650; background: transparent; text-decoration: none; font: 600 12px Manrope, sans-serif; cursor: pointer; }
.menu-item:hover { background: #edf8f5; }
.menu-item svg { width: 19px; height: 19px; }
.logout-item { color: #b33b3b; }
.main-content { width: min(100%, 1240px); margin: 0 auto; padding: 42px 38px 60px; }
@media (max-width: 980px) { .sidebar { display: none; } .workspace,.sidebar-collapsed .workspace { width: 100%; margin-left: 0; } .app-header { padding: 0 24px; } }
@media (max-width: 760px) { .app-shell { padding-top: 72px; } .app-header { min-height: 72px; height: 72px; padding: 10px 16px; } .navbar-brand div, .account-trigger .user-copy { display: none; } .navbar-farm-select { width: min(40vw,170px); margin: 0 8px 0 auto; } .navbar-farm-badge { max-width: min(40vw,170px); margin: 0 8px 0 auto; } .account-trigger { margin-left: 0; } .main-content { padding: 28px 16px 44px; } }
</style>
