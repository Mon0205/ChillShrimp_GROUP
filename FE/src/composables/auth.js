import { reactive } from 'vue'
import { api } from '../services/api.js'
import { showToast } from './toast.js'

const auth = reactive({ user: null, ready: false })

export async function loadUser() {
  try { auth.user = (await api('/auth/me')).data }
  catch { auth.user = null }
  finally { auth.ready = true }
  return auth.user
}

export async function login(email, password) {
  const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  auth.user = result.data.user
  auth.ready = true
  localStorage.setItem('authSessionActive', 'true')
}

export async function logout() {
  try { await api('/auth/logout', { method: 'POST' }) }
  finally {
    auth.user = null
    localStorage.removeItem('authSessionActive')
  }
}

export function useAuth() { return auth }

const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const HEARTBEAT_MS = 5 * 60 * 1000
let sessionHandlingInstalled = false

export function installSessionHandling(router) {
  if (sessionHandlingInstalled) return
  sessionHandlingInstalled = true

  let lastActivity = Date.now()
  let activitySinceHeartbeat = false
  let expiring = false

  const markActivity = () => {
    lastActivity = Date.now()
    activitySinceHeartbeat = true
  }

  const expireSession = async () => {
    if (expiring || !auth.user) return
    expiring = true
    try { await logout() } catch { auth.user = null }
    localStorage.removeItem('authSessionActive')
    showToast('Phiên đăng nhập đã hết hạn', 'warning')
    if (router.currentRoute.value.path !== '/login') await router.replace('/login')
    expiring = false
  }

  for (const eventName of ['pointerdown', 'keydown', 'scroll', 'touchstart']) {
    window.addEventListener(eventName, markActivity, { passive: true })
  }
  window.addEventListener('auth:session-expired', expireSession)

  window.setInterval(() => {
    if (auth.user && Date.now() - lastActivity >= IDLE_TIMEOUT_MS) expireSession()
  }, 30 * 1000)

  window.setInterval(async () => {
    if (!auth.user || !activitySinceHeartbeat || Date.now() - lastActivity >= IDLE_TIMEOUT_MS) return
    activitySinceHeartbeat = false
    await loadUser()
  }, HEARTBEAT_MS)
}
