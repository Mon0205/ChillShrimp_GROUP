import { createRouter, createWebHistory } from 'vue-router'
import { loadUser, useAuth } from '../composables/auth.js'
import DashboardPage from '../pages/dashboard/DashboardPage.vue'
import FarmsPage from '../pages/farms/FarmsPage.vue'
import PondsTanksPage from '../pages/ponds-tanks/PondsTanksPage.vue'
import SeedSuppliersPage from '../pages/seed-suppliers/SeedSuppliersPage.vue'
import SeedBatchesPage from '../pages/seed-batches/SeedBatchesPage.vue'
import FeedingLogsPage from '../pages/feeding/FeedingLogsPage.vue'
import WaterChangeLogsPage from '../pages/water-changes/WaterChangeLogsPage.vue'
import WaterParameterLogsPage from '../pages/water-parameters/WaterParameterLogsPage.vue'
import EnvironmentThresholdsPage from '../pages/environment-thresholds/EnvironmentThresholdsPage.vue'
import TreatmentLogsPage from '../pages/treatments/TreatmentLogsPage.vue'
import InventoryUsagePage from '../pages/inventory-supplies/InventoryUsagePage.vue'
import InventorySuppliesPage from '../pages/inventory-supplies/InventorySuppliesPage.vue'
import UsersPage from '../pages/users/UsersPage.vue'
import LoginPage from '../pages/login/LoginPage.vue'
import SetPasswordPage from '../pages/set-password/SetPasswordPage.vue'
import ProfilePage from '../pages/profile/ProfilePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginPage, meta: { guest: true } },
    { path: '/set-password', component: SetPasswordPage, meta: { public: true } },
    { path: '/dashboard', component: DashboardPage, meta: { auth: true } },
    { path: '/users', component: UsersPage, meta: { auth: true } },
    { path: '/farms', component: FarmsPage, meta: { auth: true } },
    { path: '/ponds-tanks', component: PondsTanksPage, meta: { auth: true } },
    { path: '/seed-suppliers', component: SeedSuppliersPage, meta: { auth: true } },
    { path: '/seed-batches', component: SeedBatchesPage, meta: { auth: true } },
    { path: '/feeding-logs', component: FeedingLogsPage, meta: { auth: true } },
    { path: '/water-change-logs', component: WaterChangeLogsPage, meta: { auth: true } },
    { path: '/water-parameter-logs', component: WaterParameterLogsPage, meta: { auth: true } },
    { path: '/environment-thresholds', component: EnvironmentThresholdsPage, meta: { auth: true } },
    { path: '/treatment-logs', component: TreatmentLogsPage, meta: { auth: true } },
    { path: '/inventory-supplies', component: InventorySuppliesPage, meta: { auth: true } },
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
})

export default router
