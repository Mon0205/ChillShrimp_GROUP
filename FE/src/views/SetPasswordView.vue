<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api.js'

const route = useRoute()
const router = useRouter()
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const loading = ref(false)
const invitationToken = computed(() => typeof route.query.token === 'string' ? route.query.token : '')

async function submit() {
  errorMessage.value = ''
  if (!invitationToken.value) return errorMessage.value = 'Link lời mời không hợp lệ.'
  if (password.value.length < 8) return errorMessage.value = 'Mật khẩu cần ít nhất 8 ký tự.'
  if (password.value !== confirmPassword.value) return errorMessage.value = 'Xác nhận mật khẩu chưa khớp.'
  loading.value = true
  try {
    await api('/auth/accept-invitation', { method: 'POST', body: JSON.stringify({ token: invitationToken.value, password: password.value }) })
    await router.replace('/login')
  } catch (error) { errorMessage.value = error.message || 'Link mời đã hết hạn hoặc không hợp lệ.' } finally { loading.value = false }
}
</script>

<template>
  <main class="auth-page"><va-card class="auth-card"><va-card-title>Thiết lập mật khẩu</va-card-title><va-card-content>
    <p class="muted">Đặt mật khẩu để hoàn tất lời mời vào trại.</p>
    <va-alert v-if="errorMessage" color="danger" class="form-alert">{{ errorMessage }}</va-alert>
    <form @submit.prevent="submit">
      <va-input v-model="password" label="Mật khẩu mới" type="password" autocomplete="new-password" class="form-field" required />
      <va-input v-model="confirmPassword" label="Xác nhận mật khẩu" type="password" autocomplete="new-password" class="form-field" required />
      <va-button type="submit" :loading="loading" block>Lưu mật khẩu</va-button>
    </form>
  </va-card-content></va-card></main>
</template>
