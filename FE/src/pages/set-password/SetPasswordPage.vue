<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../services/api.js'
import { showToast } from '../../composables/toast.js'

const route = useRoute(), router = useRouter()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const invitation = ref(null), password = ref(''), confirmPassword = ref('')
const loading = ref(true), submitting = ref(false), error = ref('')
const roleNames = { owner: 'Chủ trại', area_manager: 'Quản lý khu vực', technician: 'Nhân viên kỹ thuật', warehouse_staff: 'Nhân viên kho' }
const mismatch = computed(() => confirmPassword.value && password.value !== confirmPassword.value)
watch(error, (message) => { if (message) { showToast(message, 'error'); error.value = '' } })

onMounted(async () => {
  if (!token) { error.value = 'Liên kết lời mời không hợp lệ.'; loading.value = false; return }
  try { invitation.value = (await api(`/users/invitation/${encodeURIComponent(token)}`)).data }
  catch (err) { error.value = err.message }
  finally { loading.value = false }
})

async function submit() {
  if (password.value.length < 8) { error.value = 'Mật khẩu cần ít nhất 8 ký tự.'; return }
  if (password.value !== confirmPassword.value) { error.value = 'Mật khẩu xác nhận không khớp.'; return }
  error.value = ''; submitting.value = true
  try {
    const result = await api('/users/accept-invitation', { method: 'POST', body: JSON.stringify({ token, password: password.value, confirmPassword: confirmPassword.value }) })
    await router.replace({ path: '/login', query: { email: result.data.email } })
  } catch (err) { error.value = err.message }
  finally { submitting.value = false }
}
</script>

<template>
  <div class="auth-page">
    <v-card class="auth-card" elevation="0">
      <div class="brand-mark">CS</div>
      <v-progress-linear v-if="loading" indeterminate color="primary" />
      <template v-else-if="invitation">
        <h1>Thiết lập mật khẩu</h1>
        <p class="muted">Bạn được mời vào <strong>{{ invitation.farmName }}</strong> với chức vụ <strong>{{ roleNames[invitation.role] }}</strong><template v-if="invitation.areaName"> tại khu vực <strong>{{ invitation.areaName }}</strong></template>.</p>
        <v-form class="auth-form" @submit.prevent="submit">
          <label class="auth-field-label">Email</label>
          <v-text-field :model-value="invitation.email" disabled hide-details="auto" />
          <label class="auth-field-label" for="new-password">Mật khẩu</label>
          <v-text-field id="new-password" v-model="password" placeholder="Tối thiểu 8 ký tự" type="password" autocomplete="new-password" hide-details="auto" required />
          <label class="auth-field-label" for="confirm-password">Xác nhận mật khẩu</label>
          <v-text-field id="confirm-password" v-model="confirmPassword" placeholder="Nhập lại mật khẩu" type="password" autocomplete="new-password" :error-messages="mismatch ? 'Mật khẩu không khớp' : ''" hide-details="auto" required />
          <v-btn type="submit" color="primary" size="large" block :loading="submitting" :disabled="!!mismatch">Chấp nhận lời mời</v-btn>
        </v-form>
      </template>
      <template v-else>
        <p class="muted">Liên kết lời mời không còn hợp lệ.</p>
        <v-btn class="mt-5" variant="outlined" block to="/login">Về trang đăng nhập</v-btn>
      </template>
    </v-card>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  color: #134e4a;
  font-family: Manrope, Inter, system-ui, sans-serif;
  background: linear-gradient(135deg, #eef8f5 0%, #fff 48%, #ccfbf1 100%);
  position: relative;
  overflow: hidden;
}
.auth-page::before, .auth-page::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}
.auth-page::before {
  width: 420px;
  height: 420px;
  background: rgba(8, 127, 110, .08);
  top: -180px;
  right: -100px;
}
.auth-page::after {
  width: 280px;
  height: 280px;
  border: 48px solid rgba(8, 127, 110, .045);
  bottom: -130px;
  left: -80px;
}
.auth-card {
  z-index: 1;
  width: min(100%, 470px);
  padding: clamp(28px, 6vw, 46px);
  border: 1px solid #dbe7e4 !important;
  border-radius: 24px !important;
  box-shadow: 0 24px 70px rgba(23, 63, 58, .11) !important;
}
h1 {
  color: #134e4a;
  font-size: clamp(1.85rem, 4vw, 2.55rem);
  line-height: 1.15;
  letter-spacing: -.045em;
  margin: 0 0 10px;
}
.muted { color: #6d7f7c; }
.brand-mark {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  margin-bottom: 28px;
  border-radius: 16px;
  color: white;
  background: #087f6e;
  font-weight: 800;
  box-shadow: 0 7px 18px rgba(8, 127, 110, .22);
}
.auth-form { display: grid; gap: 9px; }
.auth-field-label {
  color: #365752;
  font-size: 12px;
  font-weight: 700;
  margin-top: 3px;
}
.auth-form .v-btn { height: 48px; margin-top: 10px; }
.auth-form :deep(input::placeholder) { color: #91a09d; opacity: 1; }
.invite-note {
  color: #788985;
  font-size: .82rem;
  line-height: 1.6;
  text-align: center;
  margin: 24px 8px 0;
}
</style>
