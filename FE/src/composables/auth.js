import { reactive, watch } from 'vue'
import { api } from '../services/api.js'
import { showToast } from './toast.js'
import { resetFarmContext } from './farm-context.js'

const auth = reactive({ user: null, ready: false })

export async function loadUser() {
  try { auth.user = (await api('/auth/me')).data }
  catch (error) {
    if (error.status === 401 || error.status === 403) auth.user = null
  }
  finally { auth.ready = true }
  return auth.user
}

export async function login(email, password) {
  const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  resetFarmContext()
  auth.user = result.data.user
  auth.ready = true
  localStorage.setItem('authSessionActive', 'true')
}

export async function logout() {
  try { await api('/auth/logout', { method: 'POST' }) }
  finally {
    auth.user = null
    resetFarmContext()
    localStorage.removeItem('authSessionActive')
  }
}

export function useAuth() { return auth }

let sessionHandlingInstalled = false

export function installSessionHandling(router) {
  if (sessionHandlingInstalled) return
  sessionHandlingInstalled = true

  let expiryTimer
  let checkingSession = false
  let expiring = false

  const checkSession = async () => {
    if (checkingSession || expiring || !auth.user) return
    checkingSession = true
    try { await loadUser() } finally { checkingSession = false }
  }

  const scheduleExpiry = () => {
    window.clearTimeout(expiryTimer)
    if (!auth.user || expiring) return
    const remaining = new Date(auth.user.sessionExpiresAt).getTime() - Date.now()
    if (!Number.isFinite(remaining)) return
    if (remaining <= 0) { void expireSession(); return }
    expiryTimer = window.setTimeout(scheduleExpiry, remaining)
  }

  const expireSession = async () => {
    if (expiring || !auth.user) return
    expiring = true
    window.clearTimeout(expiryTimer)
    try { await logout() } catch { auth.user = null }
    localStorage.removeItem('authSessionActive')
    showToast('Phiên đăng nhập đã hết hạn', 'warning')
    try {
      if (router.currentRoute.value.path !== '/login') await router.replace('/login')
    } finally { expiring = false }
  }

  const resumeSession = () => {
    if (document.visibilityState === 'hidden' || !auth.user || expiring) return
    // The server deadline stays fixed across activity, reloads and tab resumes.
    scheduleExpiry()
    if (!expiring) void checkSession()
  }

  window.addEventListener('auth:session-expired', expireSession)

  window.addEventListener('focus', resumeSession)
  document.addEventListener('visibilitychange', resumeSession)
  watch(() => auth.user?.sessionExpiresAt, () => {
    scheduleExpiry()
  }, { immediate: true, flush: 'sync' })
}
