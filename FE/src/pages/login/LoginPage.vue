<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../../composables/auth.js'
import { api } from '../../services/api.js'
import { showToast } from '../../composables/toast.js'

const route = useRoute(), router = useRouter()
const email = ref(route.query.email || ''), password = ref(''), showPassword = ref(false)
const loading = ref(false), error = ref('')
const forgotDialog = ref(false), otpSent = ref(false), sendingOtp = ref(false), resetting = ref(false)
const forgotEmail = ref(email.value), otp = ref(''), newPassword = ref(''), confirmPassword = ref('')
const forgotError = ref(''), forgotSuccess = ref('')
watch(error, (message) => { if (message) { showToast(message, 'error'); error.value = '' } })
watch(forgotError, (message) => { if (message) { showToast(message, 'error'); forgotError.value = '' } })
watch(forgotSuccess, (message) => { if (message) { showToast(message, 'success'); forgotSuccess.value = '' } })

async function submit() {
  error.value = ''; loading.value = true
  try {
    await login(email.value, password.value)
    await router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard')
  } catch (err) { error.value = err.message }
  finally { loading.value = false }
}

function openForgotPassword() {
  forgotEmail.value = email.value
  otpSent.value = false; otp.value = ''; newPassword.value = ''; confirmPassword.value = ''
  forgotError.value = ''; forgotSuccess.value = ''; forgotDialog.value = true
}

async function sendOtp() {
  forgotError.value = ''; forgotSuccess.value = ''; sendingOtp.value = true
  try {
    await api('/users/password-otp', { method: 'POST', body: JSON.stringify({ email: forgotEmail.value }) })
    otpSent.value = true
    forgotSuccess.value = `Đã gửi mã OTP tới ${forgotEmail.value}.`
  } catch (err) { forgotError.value = err.message }
  finally { sendingOtp.value = false }
}

async function resetPassword() {
  forgotError.value = ''; forgotSuccess.value = ''
  if (newPassword.value !== confirmPassword.value) { forgotError.value = 'Mật khẩu xác nhận không khớp.'; return }
  resetting.value = true
  try {
    await api('/users/password-otp/reset', { method: 'POST', body: JSON.stringify({ email: forgotEmail.value, otp: otp.value, newPassword: newPassword.value, confirmPassword: confirmPassword.value }) })
    email.value = forgotEmail.value; password.value = ''
    forgotSuccess.value = 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.'
    setTimeout(() => { forgotDialog.value = false }, 1200)
  } catch (err) { forgotError.value = err.message }
  finally { resetting.value = false }
}
</script>

<template>
  <div class="auth-page">
    <v-card class="auth-card" elevation="0">
      <div class="brand-mark">CS</div>
      <h1>Chào mừng trở lại</h1>
      <p class="muted">Đăng nhập để quản lý trại của bạn.</p>
      <v-form class="auth-form" @submit.prevent="submit">
        <label class="auth-field-label" for="login-email">Email</label>
        <v-text-field id="login-email" v-model="email" placeholder="Nhập email của bạn" type="email" autocomplete="email" hide-details="auto" required />
        <label class="auth-field-label" for="login-password">Mật khẩu</label>
        <v-text-field id="login-password" v-model="password" placeholder="Nhập mật khẩu" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'" hide-details="auto" @click:append-inner="showPassword = !showPassword" required />
        <button class="forgot-link" type="button" @click="openForgotPassword">Quên mật khẩu?</button>
        <v-btn type="submit" color="primary" size="large" block :loading="loading">Đăng nhập</v-btn>
      </v-form>
      <p class="invite-note">Chưa có tài khoản? Tài khoản chỉ được tạo qua lời mời từ quản trị viên.</p>
    </v-card>
    <v-dialog v-model="forgotDialog" max-width="480">
      <v-card class="forgot-card" elevation="0">
        <div class="forgot-heading"><div><span>KHÔI PHỤC TÀI KHOẢN</span><h2>Quên mật khẩu</h2></div><button type="button" aria-label="Đóng" @click="forgotDialog = false">×</button></div>
        <p class="muted">Nhận mã OTP qua email để đặt lại mật khẩu.</p>
        <v-form v-if="!otpSent" class="forgot-form" @submit.prevent="sendOtp">
          <label class="auth-field-label">Email tài khoản</label>
          <v-text-field v-model="forgotEmail" type="email" autocomplete="email" placeholder="name@example.com" hide-details="auto" required />
          <v-btn type="submit" color="primary" size="large" block :loading="sendingOtp">Gửi mã OTP</v-btn>
        </v-form>
        <v-form v-else class="forgot-form" @submit.prevent="resetPassword">
          <div class="sent-to">Mã đã gửi tới <strong>{{ forgotEmail }}</strong></div>
          <label class="auth-field-label">Mã OTP</label>
          <v-otp-input v-model="otp" :length="6" type="number" />
          <label class="auth-field-label">Mật khẩu mới</label>
          <v-text-field v-model="newPassword" type="password" autocomplete="new-password" hint="Tối thiểu 8 ký tự" persistent-hint required />
          <label class="auth-field-label">Xác nhận mật khẩu mới</label>
          <v-text-field v-model="confirmPassword" type="password" autocomplete="new-password" hide-details="auto" required />
          <v-btn type="submit" color="primary" size="large" block :loading="resetting">Đặt lại mật khẩu</v-btn>
          <button class="resend-link" type="button" :disabled="sendingOtp" @click="sendOtp">Gửi lại mã OTP</button>
        </v-form>
      </v-card>
    </v-dialog>
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
.forgot-link, .resend-link { justify-self: end; padding: 3px 0; border: 0; color: #087f6e; background: transparent; font: 700 12px Manrope, sans-serif; cursor: pointer; }
.auth-form .forgot-link { margin-top: 2px; }
.forgot-card { padding: 28px; border-radius: 20px !important; }
.forgot-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.forgot-heading span { color: #087f6e; font-size: 10px; font-weight: 800; letter-spacing: .12em; }
.forgot-heading h2 { margin: 5px 0 0; color: #134e4a; font-size: 1.55rem; }
.forgot-heading button { width: 34px; height: 34px; border: 0; border-radius: 9px; color: #61736f; background: #edf5f3; font-size: 24px; cursor: pointer; }
.forgot-form { display: grid; gap: 9px; margin-top: 22px; }
.forgot-form > .v-btn { height: 48px; margin-top: 10px; }
.sent-to { padding: 11px 13px; border-radius: 10px; color: #5e7470; background: #edf8f5; font-size: 12px; }
.auth-form :deep(input::placeholder) { color: #91a09d; opacity: 1; }
.auth-form :deep(.v-field) { background: #fff; overflow: hidden; }
.auth-form :deep(input:-webkit-autofill),
.auth-form :deep(input:-webkit-autofill:hover),
.auth-form :deep(input:-webkit-autofill:focus) {
  -webkit-text-fill-color: #134e4a;
  -webkit-box-shadow: 0 0 0 1000px #eaf4ff inset !important;
  box-shadow: 0 0 0 1000px #eaf4ff inset !important;
  transition: background-color 9999s ease-out 0s;
}
.auth-form :deep(.v-field:has(input:-webkit-autofill)) { background: #eaf4ff; }
.invite-note {
  color: #788985;
  font-size: .82rem;
  line-height: 1.6;
  text-align: center;
  margin: 24px 8px 0;
}
</style>
