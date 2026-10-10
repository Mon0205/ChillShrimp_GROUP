import { createRouter, createWebHistory } from 'vue-router'
import { loadUser, useAuth } from '../composables/auth.js'
import { loadFarmContext, useFarmContext, confirmFarmSelection } from '../composables/farm-context.js'
import SelectFarmPage from '../pages/select-farm/index.vue'
import CareLogsPage from '../pages/care/index.vue'
import DashboardPage from '../pages/dashboard/index.vue'
import FarmsPage from '../pages/farms/index.vue'
import PondsTanksPage from '../pages/ponds-tanks/index.vue'
import SeedSuppliersPage from '../pages/seed-suppliers/index.vue'
import SeedBatchesPage from '../pages/seed-batches/index.vue'
import QualityPage from '../pages/quality/index.vue'
import InventoryUsagePage from '../pages/usage/index.vue'
import InventorySuppliesPage from '../pages/inventory/index.vue'
import InventoryRequestsPage from '../pages/requests/index.vue'
import UsersPage from '../pages/users/index.vue'
import LoginPage from '../pages/login/index.vue'
import SetPasswordPage from '../pages/set-password/index.vue'
import ProfilePage from '../pages/profile/index.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginPage, meta: { guest: true } },
    { path: '/set-password', component: SetPasswordPage, meta: { public: true } },
    { path: '/dashboard', component: DashboardPage, meta: { auth: true } },
    { path: '/select-farm', component: SelectFarmPage, meta: { auth: true } },
    { path: '/users', component: UsersPage, meta: { auth: true } },
    { path: '/farms', component: FarmsPage, meta: { auth: true } },
    { path: '/ponds-tanks', component: PondsTanksPage, meta: { auth: true } },
    { path: '/seed-suppliers', component: SeedSuppliersPage, meta: { auth: true } },
    { path: '/seed-batches', component: SeedBatchesPage, meta: { auth: true } },
    { path: '/quality-checks', component: QualityPage, meta: { auth: true } },
    { path: '/care-logs', component: CareLogsPage, meta: { auth: true } },
    { path: '/feeding-logs', redirect: (to) => ({ path: '/care-logs', query: { ...to.query, tab: 'feeding' } }) },
    { path: '/water-change-logs', redirect: (to) => ({ path: '/care-logs', query: { ...to.query, tab: 'water-changes' } }) },
    { path: '/water-parameter-logs', redirect: (to) => ({ path: '/care-logs', query: { ...to.query, tab: 'water-parameters' } }) },
    { path: '/environment-thresholds', redirect: (to) => ({ path: '/care-logs', query: { ...to.query, tab: 'thresholds' } }) },
    { path: '/treatment-logs', redirect: (to) => ({ path: '/care-logs', query: { ...to.query, tab: 'treatments' } }) },
    { path: '/inventory-supplies', component: InventorySuppliesPage, meta: { auth: true } },
    { path: '/inventory-requests', component: InventoryRequestsPage, meta: { auth: true } },
    { path: '/inventory-usage', component: InventoryUsagePage, meta: { auth: true } },
    { path: '/profile', component: ProfilePage, meta: { auth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuth()
  if (!auth.ready) await loadUser()
  if (to.meta.auth && !auth.user) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.guest && auth.user) return '/dashboard'
  if (to.meta.auth && auth.user) {
    try {
      await loadFarmContext()
      const context = useFarmContext()
      if (context.farms.length > 1 && context.selectionRequired && to.path !== '/select-farm') {
        return { path: '/select-farm', query: { redirect: to.fullPath } }
      }
      if (context.farms.length === 1) confirmFarmSelection(context.farms[0].id)
      if (to.path === '/select-farm' && context.farms.length < 2) return '/dashboard'
    } catch {
      if (to.path !== '/select-farm') return { path: '/select-farm', query: { redirect: to.fullPath } }
    }
  }
})

export default router
