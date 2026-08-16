import { createRouter, createWebHistory } from 'vue-router'
import { authState, initializeAuth } from '../composables/auth.js'
import DashboardView from '../views/DashboardView.vue'
import InvitationView from '../views/InvitationView.vue'
import LoginView from '../views/LoginView.vue'
import SetPasswordView from '../views/SetPasswordView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/set-password', component: SetPasswordView, meta: { public: true } },
    { path: '/dashboard', component: DashboardView },
    { path: '/admin/invitations', component: InvitationView },
  ],
})

router.beforeEach(async (to) => {
  await initializeAuth()
  if (!to.meta.public && !authState.user) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.path === '/login' && authState.user) return '/dashboard'
})

export default router
