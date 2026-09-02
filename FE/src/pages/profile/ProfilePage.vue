<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { useAuth } from '../../composables/auth.js'
import { api } from '../../services/api.js'
import { showToast } from '../../composables/toast.js'

const auth = useAuth()
const profile = ref(null)
const form = ref({ displayName: '', phone: '' })
const loading = ref(true), saving = ref(false), changing = ref(false), sendingOtp = ref(false), resetting = ref(false)
const error = ref(''), success = ref('')
const password = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const otp = ref({ code: '', newPassword: '', confirmPassword: '' })
const otpSent = ref(false)
const tab = ref('current')
const roleNames = { owner: 'Chủ trại', area_manager: 'Quản lý khu vực', technician: 'Nhân viên kỹ thuật', warehouse_staff: 'Nhân viên kho' }
const roleText = computed(() => profile.value?.memberships?.map((item) => `${roleNames[item.role]} · ${item.farm.name}${item.area ? ` · ${item.area.name}` : ''}`).join('\n') || 'Chưa được phân quyền')
watch(error, (message) => { if (message) { showToast(message, 'error'); error.value = '' } })
watch(success, (message) => { if (message) { showToast(message, 'success'); success.value = '' } })

async function loadProfile() {
  try {
    profile.value = (await api('/users/me')).data
    form.value = { displayName: profile.value.displayName || '', phone: profile.value.phone || '' }
  } catch (err) { error.value = err.message }
  finally { loading.value = false }
}
onMounted(loadProfile)

async function saveProfile() {
  error.value = ''; success.value = ''; saving.value = true
  try {
    const result = await api('/users/me', { method: 'PATCH', body: JSON.stringify(form.value) })
    profile.value = { ...profile.value, ...result.data }
    auth.user = { ...auth.user, ...result.data }
    success.value = 'Đã cập nhật thông tin cá nhân.'
  } catch (err) { error.value = err.message }
  finally { saving.value = false }
}

async function changePassword() {
  error.value = ''; success.value = ''; changing.value = true
  try {
    await api('/users/me/change-password', { method: 'POST', body: JSON.stringify(password.value) })
    password.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    success.value = 'Đổi mật khẩu thành công.'
  } catch (err) { error.value = err.message }
  finally { changing.value = false }
}

async function sendOtp() {
  error.value = ''; success.value = ''; sendingOtp.value = true
  try {
    await api('/users/me/password-otp', { method: 'POST' })
    otpSent.value = true; success.value = `Đã gửi OTP tới ${profile.value.email}.`
  } catch (err) { error.value = err.message }
  finally { sendingOtp.value = false }
}

async function resetWithOtp() {
  error.value = ''; success.value = ''; resetting.value = true
  try {
    await api('/users/me/password-otp/reset', { method: 'POST', body: JSON.stringify({ otp: otp.value.code, newPassword: otp.value.newPassword, confirmPassword: otp.value.confirmPassword }) })
    otp.value = { code: '', newPassword: '', confirmPassword: '' }; otpSent.value = false
    success.value = 'Đặt lại mật khẩu thành công.'
  } catch (err) { error.value = err.message }
  finally { resetting.value = false }
}
</script>

<template>
  <AppShell>
    <div class="page-heading"><span>HỒ SƠ TÀI KHOẢN</span><h1>Thông tin cá nhân</h1><p>Cập nhật thông tin liên hệ và bảo vệ tài khoản của bạn.</p></div>
    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />
    <template v-else-if="profile">
      <div class="profile-grid">
        <v-card class="profile-card" elevation="0">
          <h2>Thông tin tài khoản</h2><p>Email và chức vụ do hệ thống quản lý nên không thể chỉnh sửa.</p>
          <v-form class="profile-form" @submit.prevent="saveProfile">
            <label>Họ và tên</label><v-text-field v-model="form.displayName" hide-details="auto" required />
            <label>Email</label><v-text-field :model-value="profile.email" disabled hide-details="auto" />
            <label>Chức vụ và phạm vi quản lý</label><v-text-field class="role-scope-field" :model-value="roleText" disabled hide-details="auto" />
            <label>Số điện thoại</label><v-text-field v-model="form.phone" placeholder="Chưa cập nhật" hide-details="auto" />
            <v-btn type="submit" color="primary" :loading="saving">Lưu thay đổi</v-btn>
          </v-form>
        </v-card>

        <v-card class="profile-card" elevation="0">
          <h2>Bảo mật</h2><p>Đổi bằng mật khẩu hiện tại hoặc xác nhận OTP gửi về email.</p>
          <v-tabs v-model="tab" color="primary" grow><v-tab value="current">Có mật khẩu cũ</v-tab><v-tab value="otp">Quên mật khẩu</v-tab></v-tabs>
          <v-window v-model="tab">
            <v-window-item value="current">
              <v-form class="profile-form security-form" @submit.prevent="changePassword">
                <label>Mật khẩu hiện tại</label><v-text-field v-model="password.currentPassword" type="password" autocomplete="current-password" hide-details="auto" required />
                <label>Mật khẩu mới</label><v-text-field v-model="password.newPassword" type="password" autocomplete="new-password" hint="Tối thiểu 8 ký tự" persistent-hint required />
                <label>Xác nhận mật khẩu mới</label><v-text-field v-model="password.confirmPassword" type="password" autocomplete="new-password" hide-details="auto" required />
                <v-btn type="submit" color="primary" :loading="changing">Đổi mật khẩu</v-btn>
              </v-form>
            </v-window-item>
            <v-window-item value="otp">
              <div class="otp-copy">OTP sẽ được gửi tới <strong>{{ profile.email }}</strong>.</div>
              <v-btn v-if="!otpSent" color="primary" variant="outlined" block :loading="sendingOtp" @click="sendOtp">Gửi mã OTP</v-btn>
              <v-form v-else class="profile-form security-form" @submit.prevent="resetWithOtp">
                <label>Mã OTP</label><v-otp-input v-model="otp.code" :length="6" type="number" />
                <label>Mật khẩu mới</label><v-text-field v-model="otp.newPassword" type="password" hide-details="auto" required />
                <label>Xác nhận mật khẩu mới</label><v-text-field v-model="otp.confirmPassword" type="password" hide-details="auto" required />
                <div class="otp-actions"><v-btn variant="text" :loading="sendingOtp" @click="sendOtp">Gửi lại OTP</v-btn><v-btn type="submit" color="primary" :loading="resetting">Xác nhận đổi</v-btn></div>
              </v-form>
            </v-window-item>
          </v-window>
        </v-card>
      </div>
    </template>
    <div v-else class="profile-unavailable">Không thể tải thông tin tài khoản.</div>
  </AppShell>
</template>

<style scoped>
.page-heading { margin-bottom: 28px; }
.page-heading span { color: #087f6e; font-size: 10px; font-weight: 800; letter-spacing: .13em; }
h1 { margin: 8px 0; color: #134e4a; font-size: clamp(1.85rem,3vw,2.55rem); letter-spacing: -.045em; }
.page-heading p, .profile-card > p { color: #6d7e7b; font-size: 13px; }
.notice { margin-bottom: 18px; }
.profile-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 22px; align-items: start; }
.profile-card { padding: 28px; border: 1px solid #dce7e4 !important; border-radius: 18px !important; }
.profile-card h2 { margin: 0 0 7px; color: #134e4a; font-size: 1.25rem; }
.profile-form { display: grid; gap: 9px; margin-top: 24px; }
.profile-form label { color: #48625e; font-size: 11px; font-weight: 700; }
.profile-form > .v-btn { justify-self: end; min-width: 150px; margin-top: 12px; }
.role-scope-field :deep(.v-field) { height: 48px; }
.role-scope-field :deep(.v-field__input) { min-height: 48px; padding-top: 0; padding-bottom: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.security-form { padding-top: 2px; }
.otp-copy { padding: 24px 0 18px; color: #6d7e7b; font-size: 13px; }
.otp-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
@media (max-width: 850px) { .profile-grid { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .profile-card { padding: 21px; } .profile-form > .v-btn { width: 100%; } }
</style>
