<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signIn } from '../composables/auth.js'

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function submit() {
  errorMessage.value = ''
  loading.value = true
  try {
    await signIn(email.value, password.value)
    await router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard')
  } catch (error) {
    errorMessage.value = error.message || 'Không thể đăng nhập'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <va-card class="auth-card">
      <va-card-title>Đăng nhập ChillShrimp</va-card-title>
      <va-card-content>
        <p class="muted">Tài khoản được tạo qua lời mời của quản trị viên.</p>
        <va-alert v-if="errorMessage" color="danger" class="form-alert">{{ errorMessage }}</va-alert>
        <form @submit.prevent="submit">
          <va-input v-model="email" label="Email" type="email" autocomplete="email" class="form-field" required />
          <va-input v-model="password" label="Mật khẩu" type="password" autocomplete="current-password" class="form-field" required />
          <va-button type="submit" :loading="loading" block>Đăng nhập</va-button>
        </form>
      </va-card-content>
    </va-card>
  </main>
</template>
