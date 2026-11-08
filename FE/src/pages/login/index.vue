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
    <div class="landscape" aria-hidden="true"><div class="sun"></div><div class="cloud"></div></div>
    <div class="brand" aria-label="Shrimp Group"><span class="brand-symbol"><img src="../../assets/login/logo.svg" alt="" /></span><span class="brand-name">Shrimp<span> Group</span></span></div>
    <section class="story-copy" aria-label="Giới thiệu Shrimp Group">
      <h1>Số hóa trại giống <em>- Tối ưu vận hành.</em></h1>
      <p>Theo dõi, quản lý và phân tích dữ liệu trại giống tập trung trên một nền tảng duy nhất.</p>
    </section>
    <v-card class="auth-card" elevation="0">
      <p class="welcome">Chào mừng trở lại</p>
      <h2>Đăng nhập vào trại.</h2>
      <p class="muted intro">Tiếp tục chăm sóc những vụ giống của bạn.</p>
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
      <footer class="card-footer"><span>© {{ new Date().getFullYear() }} Shrimp Group</span><span><v-icon icon="mdi-shield-check-outline" size="14" aria-hidden="true" /> Dành riêng cho đội ngũ của trại</span></footer>
    </v-card>
    <p class="farm-note"><v-icon icon="mdi-shield-check-outline" size="17" aria-hidden="true" /> Chăm từng con giống. Vững từng vụ nuôi.</p>
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
.auth-page{position:relative;isolation:isolate;min-height:100svh;display:grid;grid-template-columns:minmax(0,1fr) clamp(360px,29vw,410px);grid-template-rows:auto auto 1fr auto;gap:20px 32px;padding:24px 7vw 16px 5vw;color:#134e4a;font-family:var(--app-font);background:#edf5ee;box-sizing:border-box}
.landscape{position:absolute;z-index:-1;inset:0;overflow:hidden;pointer-events:none;background:#edf5ee url('../../assets/login/farm.svg') center/100% 100% no-repeat}
.sun{position:absolute;top:13%;left:44%;width:94px;height:94px;border-radius:50%;background:#f1e7ba80;box-shadow:0 0 0 24px #f1e7ba24}.cloud{position:absolute;top:12%;left:30%;width:140px;height:27px;background:#ffffff70;filter:blur(2px);border-radius:100%}.cloud::before{content:'';position:absolute;left:40px;bottom:0;width:65px;height:45px;border-radius:50%;background:#ffffff70}
.brand{grid-column:1/-1;display:flex;align-items:center;gap:12px;width:max-content}.brand-symbol{display:grid;place-items:center;width:58px;height:58px;border-radius:18px;background:#087f6e;box-shadow:0 6px 18px #087f6e20}.brand-symbol img{width:54px;height:54px}.brand-name{font-size:24px;letter-spacing:-.8px;font-weight:750}.brand-name span{font-weight:450}
.story-copy{grid-column:1/-1;margin-top:8px}.story-copy h1{font-size:clamp(24px,2.5vw,38px);line-height:1.2;font-weight:600;letter-spacing:-1.3px;margin:0 0 12px;white-space:nowrap}.story-copy em{font-style:normal;color:#087f6e}.story-copy p{font-size:13px;line-height:1.6;color:#516c62;margin:0;max-width:630px}
.auth-card{grid-column:2;align-self:center;width:100%;padding:26px 28px 20px;border:1px solid #fff!important;border-radius:24px!important;background:#fffffff2!important;box-shadow:0 24px 90px #285d3f1a,0 3px 16px #285d3f08!important;backdrop-filter:blur(16px)}
.welcome{font-size:10px;font-weight:650;letter-spacing:1.5px;color:#087f6e;text-transform:uppercase;margin:0 0 5px}.password-label{display:flex;align-items:center;justify-content:space-between;gap:8px}.auth-card h2{font-size:27px;line-height:1.25;letter-spacing:-1px;margin:0 0 7px}.muted{color:#60756f}.intro{font-size:13px;margin:0 0 22px}.auth-form{display:grid;gap:8px}.auth-field-label{color:#365752;font-size:13px;font-weight:600;margin-top:3px}.auth-form>.v-btn[type="submit"]{height:48px;margin-top:4px;border-radius:9px}.auth-form :deep(.v-field){border-radius:9px;background:#fff}.auth-form :deep(input){font-size:16px}.auth-form :deep(input::placeholder){color:#71877e;opacity:1}
.forgot-link,.resend-link{justify-self:end;padding:3px 0;color:#087f6e;font-size:12px;font-weight:600}.auth-form .forgot-link{min-height:36px;margin-top:0}.invite-note{display:flex;gap:10px;border-top:1px solid #dce6e2;margin-top:18px;padding-top:15px;color:#60756f;font-size:11px;line-height:1.6}.invite-note>.v-icon{margin-top:2px;color:#648477}.invite-note p{margin:0}.invite-note strong{color:#456457;font-weight:600}.card-footer{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;border-top:1px solid #e1e9e3;margin-top:16px;padding-top:12px;color:#60756f;font-size:9px}.card-footer span:last-child{display:flex;gap:4px;align-items:center}.farm-note{grid-column:1/-1;display:flex;align-items:center;gap:8px;font-size:11px;color:#416350;margin:0}
.forgot-card{padding:28px;border-radius:20px!important}.forgot-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.forgot-heading span{color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}.forgot-heading h2{margin:5px 0 0;color:#134e4a;font-size:1.55rem}.forgot-form{display:grid;gap:9px;margin-top:22px}.forgot-form>.v-btn{height:48px;margin-top:10px}.sent-to{padding:11px 13px;border-radius:10px;color:#5e7470;background:#edf8f5;font-size:12px;overflow-wrap:anywhere}
.auth-form :deep(input:-webkit-autofill){-webkit-text-fill-color:#134e4a;-webkit-box-shadow:0 0 0 1000px #eaf4ff inset!important;box-shadow:0 0 0 1000px #eaf4ff inset!important}
@media(min-width:1600px){.auth-page{padding-right:12vw}.story-copy{margin-top:8px}}
@media(min-width:801px) and (max-height:800px){.auth-page{gap:16px 28px}.brand-symbol{width:44px;height:44px;border-radius:14px}.brand-symbol img{width:42px;height:42px}.story-copy{margin-top:0}.story-copy h1{font-size:clamp(23px,2.3vw,34px);margin-bottom:8px}.story-copy p{font-size:12px}.auth-card{padding:20px 24px 16px}.intro{margin-bottom:16px}}
@media(max-width:800px){.auth-page{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto 1fr auto;padding:16px 20px;gap:18px}.brand{grid-column:1}.brand-symbol{width:40px;height:40px;border-radius:12px}.brand-symbol img{width:38px;height:38px}.brand-name{font-size:22px}.story-copy{grid-column:1;margin:0;text-align:center}.story-copy h1{font-size:clamp(13px,3.6vw,27px);letter-spacing:-.45px;margin-bottom:8px}.story-copy p{font-size:11px;line-height:1.5;max-width:440px;margin:auto}.auth-card{grid-column:1;justify-self:center;max-width:400px;align-self:center;padding:22px 23px 17px}.auth-card h2{font-size:25px}.intro{margin-bottom:18px}.farm-note{grid-column:1;justify-content:center;font-size:10px}.landscape{background-size:190% 64%;background-position:35% bottom}.sun{top:8%;left:75%;width:70px;height:70px}.cloud{top:4%;left:50%}}
@media(max-height:620px){.auth-page{min-height:100svh;grid-template-rows:auto auto auto auto}.auth-card{align-self:start}}
</style>
