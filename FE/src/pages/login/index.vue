<script setup>
import { required, emailRule, passwordRule, matchingPassword, otpRule } from '../../utils/validation.js'
import { computed, onUnmounted, ref, watch } from 'vue'
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
const otpExpiresAt = ref(0), now = ref(Date.now())
const secondsLeft = computed(() => Math.max(0, Math.ceil((otpExpiresAt.value - now.value) / 1000)))
const timer = setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(timer))
watch(error, (message) => { if (message) { showToast(message, 'error'); error.value = '' } })
watch(forgotError, (message) => { if (message) { showToast(message, 'error'); forgotError.value = '' } })
watch(forgotSuccess, (message) => { if (message) { showToast(message, 'success'); forgotSuccess.value = '' } })

async function submit(event) {
  if (event?.then && !(await event).valid) return
  if (loading.value) return
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

async function sendOtp(event) {
  if (event?.then && !(await event).valid) return
  if (sendingOtp.value || resetting.value) return
  if (!/^\S+@\S+\.\S+$/.test(forgotEmail.value.trim())) { forgotError.value = 'Vui lòng nhập email hợp lệ.'; return }
  forgotError.value = ''; forgotSuccess.value = ''; sendingOtp.value = true
  try {
    const result = await api('/users/password-otp', { method: 'POST', body: JSON.stringify({ email: forgotEmail.value }) })
    otpExpiresAt.value = new Date(result.data.expiresAt).getTime()
    now.value = Date.now(); otp.value = ''
    otpSent.value = true
    forgotSuccess.value = `Đã gửi mã OTP tới ${forgotEmail.value}.`
  } catch (err) { forgotError.value = err.message }
  finally { sendingOtp.value = false }
}

async function resetPassword(event) {
  if (event?.then && !(await event).valid) return
  forgotError.value = ''; forgotSuccess.value = ''
  if (resetting.value || sendingOtp.value) return
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
  <main class="auth-page">
    <div class="landscape" aria-hidden="true"><img src="../../assets/login/hatchery-background.webp" alt="" width="1536" height="1024" fetchpriority="high" /></div>
    <header class="auth-header"><a class="brand" href="/login" aria-label="ChillShrimp" translate="no"><span class="brand-symbol">CS</span><span class="brand-name">ChillShrimp</span></a></header>
    <div class="auth-layout">
      <section class="story-copy" aria-label="Giới thiệu ChillShrimp">
        <span class="story-eyebrow">QUẢN LÝ TRẠI GIỐNG</span>
        <h1>Kết nối vận hành.<br />Vững từng mùa nuôi.</h1>
        <p>Trại giống, con giống và đội ngũ.<br />Một không gian làm việc.</p>
      </section>
    <v-card class="auth-card" elevation="0">
      <span class="card-brand" aria-hidden="true">CS</span>
      <h2>Chào mừng trở lại</h2>
      <p class="muted intro">Đăng nhập vào không gian của bạn.</p>
      <v-form class="auth-form" @submit.prevent="submit">
        <label class="auth-field-label" for="login-email">Email</label>
        <v-text-field id="login-email" :rules="[required('email'), emailRule]" v-model="email" type="email" autocomplete="email" prepend-inner-icon="mdi-email-outline" placeholder="Nhập email của bạn" density="comfortable" variant="outlined" hide-details="auto" required />
        <div class="password-label"><label class="auth-field-label" for="login-password">Mật khẩu</label><v-btn variant="text" class="forgot-link" type="button" @click="openForgotPassword">Quên mật khẩu?</v-btn></div>
        <v-text-field id="login-password" :rules="[required('mật khẩu')]" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" prepend-inner-icon="mdi-lock-outline" placeholder="Nhập mật khẩu" density="comfortable" variant="outlined" hide-details="auto" required>
          <template #append-inner>
            <v-btn variant="text" type="button" size="small" :icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'" :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" :aria-pressed="showPassword" @click="showPassword = !showPassword" />
          </template>
        </v-text-field>
        <v-btn type="submit" color="primary" size="large" block append-icon="mdi-arrow-right" :loading="loading">Đăng nhập</v-btn>
      </v-form>
      <div class="invite-note"><v-icon icon="mdi-account-group-outline" size="20" aria-hidden="true" /><p><strong>Chưa có tài khoản?</strong> Liên hệ quản trị viên trại để nhận lời mời.</p></div>
    </v-card>
    </div>
    <footer class="auth-footer"><span>© {{ new Date().getFullYear() }} ChillShrimp</span><span>Ảnh AI minh họa</span></footer>
    <v-dialog v-model="forgotDialog" max-width="480" aria-labelledby="forgot-title">
      <v-card class="forgot-card" elevation="0">
        <div class="forgot-heading"><div><span>KHÔI PHỤC TÀI KHOẢN</span><h2 id="forgot-title">Quên mật khẩu</h2></div><v-btn variant="text" type="button" aria-label="Đóng" @click="forgotDialog = false" icon="mdi-close" /></div>
        <p class="muted">Nhận mã OTP qua email để đặt lại mật khẩu.</p>
        <v-form v-if="!otpSent" class="forgot-form" @submit.prevent="sendOtp">
          <label class="auth-field-label" for="forgot-email">Email tài khoản</label>
          <v-text-field id="forgot-email" :rules="[required('email'), emailRule]" v-model="forgotEmail" type="email" autocomplete="email" hide-details="auto" required />
          <v-btn type="submit" color="primary" size="large" block :loading="sendingOtp">Gửi mã OTP</v-btn>
        </v-form>
        <v-form v-else class="forgot-form" @submit.prevent="resetPassword">
          <div class="sent-to">Mã đã gửi tới <strong>{{ forgotEmail }}</strong></div>
          <p role="status">{{ secondsLeft > 0 ? `Mã OTP còn hiệu lực ${secondsLeft} giây.` : 'Mã OTP đã hết hạn. Vui lòng gửi mã mới.' }}</p>
          <label class="auth-field-label" id="forgot-otp-label">Mã OTP</label>
          <v-input :model-value="otp" :rules="[otpRule]" hide-details="auto"><template #default="{ isValid }"><v-otp-input aria-labelledby="forgot-otp-label" v-model="otp" :length="6" type="number" :error="isValid.value === false" /></template></v-input>
          <label class="auth-field-label" for="forgot-new-password">Mật khẩu mới</label>
          <v-text-field id="forgot-new-password" :rules="[passwordRule]" v-model="newPassword" type="password" autocomplete="new-password" required />
          <label class="auth-field-label" for="forgot-confirm-password">Xác nhận mật khẩu mới</label>
          <v-text-field id="forgot-confirm-password" :rules="[required('xác nhận mật khẩu'), matchingPassword(() => newPassword)]" v-model="confirmPassword" type="password" autocomplete="new-password" hide-details="auto" required />
          <v-btn type="submit" color="primary" size="large" block :loading="resetting">Đặt lại mật khẩu</v-btn>
          <v-btn variant="text" class="resend-link" type="button" :disabled="sendingOtp || resetting" @click="sendOtp">Gửi lại mã OTP</v-btn>
        </v-form>
      </v-card>
    </v-dialog>
  </main>
</template>

<style scoped>
@font-face{font-family:ChillLoginManrope;src:url('../../assets/login/fonts/manrope-regular.ttf') format('truetype');font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:ChillLoginManrope;src:url('../../assets/login/fonts/manrope-semibold.ttf') format('truetype');font-weight:600;font-style:normal;font-display:swap}
@font-face{font-family:ChillLoginManrope;src:url('../../assets/login/fonts/manrope-bold.ttf') format('truetype');font-weight:700;font-style:normal;font-display:swap}
.auth-page{position:relative;isolation:isolate;min-height:100svh;display:flex;flex-direction:column;background:#123e35;color:#fff;font-family:ChillLoginManrope,'Segoe UI',sans-serif;box-sizing:border-box}
.landscape{position:absolute;inset:0;z-index:-1;overflow:hidden;background:#123e35;pointer-events:none}
.landscape img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}
.landscape:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0b352ded 0%,#0c382db8 37%,#123e3538 76%),linear-gradient(0deg,#0b30295c,transparent 55%)}
.auth-header{display:flex;align-items:center;padding:35px 5vw}
.brand{display:flex;align-items:center;gap:10px;width:max-content;color:#f5f8f0;text-decoration:none;font-size:25px;font-weight:700;letter-spacing:-.9px}
.brand-symbol{display:grid;place-items:center;width:33px;height:36px;border-radius:10px 10px 10px 3px;background:#b9dcc5;color:#173f32;font-size:13px;font-weight:700;letter-spacing:-.7px;box-shadow:inset 0 1px #f6fff07a}
.auth-layout{display:grid;grid-template-columns:minmax(0,1fr) 425px;align-items:center;gap:60px;max-width:1400px;width:100%;margin:auto;padding:30px 5vw 55px;box-sizing:border-box}
.story-eyebrow{display:block;font-size:9px;letter-spacing:2px;color:#c4dfc8;margin-bottom:23px}
.story-copy h1{font-size:clamp(34px,4vw,57px);line-height:1.25;font-weight:600;color:#f4f9ed;letter-spacing:-2px;margin:0;text-wrap:balance}
.story-copy p{font-size:13px;line-height:1.9;color:#d0e3d0;margin:25px 0 0}
.auth-card{width:100%;min-width:0;padding:35px;border:1px solid #ffffffc2!important;border-radius:17px!important;background:#fffffff7!important;color:#193d30;box-shadow:0 24px 80px #082a2b38!important;backdrop-filter:blur(14px)}
.card-brand{display:grid;place-items:center;width:42px;height:44px;border:1px solid #d8e6cf;border-radius:11px;background:#eaf3e3;color:#40693f;font-size:14px;font-weight:700;margin-bottom:24px}
.auth-card h2{font-size:25px;line-height:1.4;font-weight:700;letter-spacing:-.9px;margin:0}
.muted{color:#61775c}.intro{font-size:11px;margin:8px 0 27px}
.auth-form{display:grid;gap:8px}.auth-field-label{color:#3e5d42;font-size:11px;font-weight:600;margin-top:3px}
.password-label{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}
.auth-form>.v-btn[type="submit"]{height:46px;margin-top:9px;border-radius:8px;font-size:12px;justify-content:space-between;padding-inline:16px;box-shadow:0 3px 8px #087f6e1c}
.auth-form :deep(.v-field){border-radius:7px;background:#fff}.auth-form :deep(.v-field__outline){color:#dbe5d3}.auth-form :deep(.v-field--focused .v-field__outline){color:#087f6e}.auth-form :deep(input){font-family:inherit;font-size:13px;min-width:0}.auth-form :deep(input::placeholder){color:#63765c;opacity:1}.auth-form :deep(.v-input__prepend),.auth-form :deep(.v-field__prepend-inner),.auth-form :deep(.v-field__append-inner){color:#64835b}.auth-form :deep(.v-input){font-family:inherit}
.forgot-link,.resend-link{color:#087f6e;font-size:10px;font-weight:600}.auth-form .forgot-link{min-width:0;min-height:28px;height:auto;padding:0;letter-spacing:0}
.invite-note{display:flex;gap:10px;border-top:1px solid #e0e8d9;margin-top:25px;padding-top:21px;color:#61775c;font-size:10px;line-height:1.7}.invite-note>.v-icon{display:none}.invite-note p{margin:0}.invite-note strong{display:block;color:#3c5e40;font-weight:600;margin-bottom:3px}
.auth-footer{display:flex;justify-content:space-between;gap:20px;padding:15px 5vw 22px;color:#e0eadf;font-size:9px}
.forgot-card{padding:28px;border-radius:16px!important;font-family:ChillLoginManrope,'Segoe UI',sans-serif}.forgot-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.forgot-heading span{color:#087f6e;font-size:10px;font-weight:700;letter-spacing:.12em}.forgot-heading h2{margin:5px 0 0;color:#193d30;font-size:24px}.forgot-form{display:grid;gap:9px;margin-top:22px}.forgot-form>.v-btn{height:46px;margin-top:10px}.sent-to{padding:11px 13px;border-radius:8px;color:#45674f;background:#edf5e9;font-size:12px;overflow-wrap:anywhere}.forgot-form :deep(.v-input){font-family:inherit}.forgot-card>.muted,.forgot-form>p{font-size:12px}
.auth-form :deep(input:-webkit-autofill){-webkit-text-fill-color:#193d30;-webkit-box-shadow:0 0 0 1000px #f4f8ed inset!important;box-shadow:0 0 0 1000px #f4f8ed inset!important}
@media(max-width:1000px){.auth-layout{grid-template-columns:minmax(0,1fr) 385px;gap:35px}.auth-card{padding:29px}.story-copy h1{font-size:37px;letter-spacing:-1.4px}}
@media(max-width:760px){.auth-header{padding:24px 22px}.brand{font-size:21px}.auth-layout{grid-template-columns:minmax(0,1fr);max-width:490px;padding:22px 20px 30px;gap:28px}.story-eyebrow{font-size:8px;margin-bottom:13px}.story-copy h1{font-size:32px;letter-spacing:-1px}.story-copy p{display:none}.auth-card{padding:27px;border-radius:13px!important}.card-brand{display:none}.auth-card h2{font-size:24px}.auth-form :deep(input){font-size:16px}.intro{margin-bottom:23px}.landscape:after{background:linear-gradient(180deg,#0b352de0,#0d3c2cb0)}.auth-footer{padding:16px 22px}.forgot-card{padding:22px}}
</style>
