import { computed, reactive } from 'vue'
import { api } from '../services/api.js'

export const authState = reactive({ user: null, initialized: false })
export const isAuthenticated = computed(() => Boolean(authState.user))

export async function initializeAuth() {
  if (authState.initialized) return
  try { authState.user = (await api('/auth/me')).data } catch { authState.user = null }
  authState.initialized = true
}

export async function signIn(email, password) {
  const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) })
  authState.user = result.data.user
  authState.initialized = true
}

export async function signOut() {
  try { await api('/auth/logout', { method: 'POST', body: '{}' }) } catch { /* server session may already be gone */ }
  authState.user = null
}
