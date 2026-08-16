import { computed, reactive } from 'vue'
import { api } from '../services/api.js'

export const authState = reactive({ user: null, initialized: false })
export const isAuthenticated = computed(() => Boolean(authState.user))

export async function initializeAuth() {
  if (authState.initialized) return
  if (localStorage.getItem('chillshrimp_token')) {
    try { authState.user = (await api('/auth/me')).data } catch { localStorage.removeItem('chillshrimp_token') }
  }
  authState.initialized = true
}

export async function signIn(email, password) {
  const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) })
  localStorage.setItem('chillshrimp_token', result.data.token)
  authState.user = result.data.user
  authState.initialized = true
}

export async function signOut() {
  localStorage.removeItem('chillshrimp_token')
  authState.user = null
}
