import { createRouter, createWebHistory } from 'vue-router'
import { loadUser, useAuth } from '../composables/auth.js'
import DashboardPage from '../pages/dashboard/DashboardPage.vue'
import FarmsPage from '../pages/farms/FarmsPage.vue'
import PondsTanksPage from '../pages/ponds-tanks/PondsTanksPage.vue'
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
