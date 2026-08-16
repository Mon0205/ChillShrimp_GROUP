<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/api.js'

const router = useRouter()
const email = ref(''); const farmId = ref(''); const role = ref('viewer'); const farms = ref([]); const pendingInvitations = ref([])
const checkMessage = ref(''); const checkColor = ref('info'); const emailAvailable = ref(false)
const loading = ref(false); const sending = ref(false)
const canSubmit = computed(() => emailAvailable.value && farmId.value && role.value)
const messages = { AVAILABLE: 'Email hợp lệ và chưa tồn tại trong hệ thống.', USER_EXISTS: 'Email này đã tồn tại trong hệ thống.', INVITATION_PENDING: 'Email này đã có lời mời đang chờ cho trại này.', INVALID_EMAIL: 'Email không hợp lệ.' }

onMounted(async () => { try { farms.value = (await api('/farms?manageable=true')).data } catch (error) { checkMessage.value = error.message; checkColor.value = 'danger' } })
async function loadInvitations() {
  if (!farmId.value) return pendingInvitations.value = []
  try { pendingInvitations.value = (await api(`/auth/invitations?farmId=${farmId.value}`)).data } catch (error) { checkMessage.value = error.message; checkColor.value = 'danger' }
}
function selectFarm() { checkEmail(); loadInvitations() }
async function checkEmail() {
  emailAvailable.value = false; checkMessage.value = ''
  if (!email.value || !farmId.value) return
  loading.value = true
  try {
    const { data } = await api(`/auth/invitations/check-email?email=${encodeURIComponent(email.value)}&farmId=${farmId.value}`)
    emailAvailable.value = data.available === true; checkMessage.value = messages[data.code] || 'Không thể dùng email này.'; checkColor.value = emailAvailable.value ? 'success' : 'warning'
  } catch (error) { checkMessage.value = error.message; checkColor.value = 'danger' } finally { loading.value = false }
}
async function sendInvite() {
  if (!canSubmit.value) return
  sending.value = true
  try { await api('/auth/invitations', { method: 'POST', body: JSON.stringify({ email: email.value, farmId: farmId.value, role: role.value }) }); checkMessage.value = 'Đã gửi email mời.'; checkColor.value = 'success'; email.value = ''; emailAvailable.value = false; await loadInvitations() } catch (error) { checkMessage.value = error.message; checkColor.value = 'danger' } finally { sending.value = false }
}
async function revokeInvitation(id) { if (!confirm('Thu hồi lời mời này?')) return; try { await api(`/auth/invitations/${id}`, { method: 'DELETE' }); await loadInvitations() } catch (error) { checkMessage.value = error.message; checkColor.value = 'danger' } }
</script>

<template>
  <main class="auth-page"><va-card class="auth-card"><va-card-title>Mời thành viên vào trại</va-card-title><va-card-content>
    <p class="muted">Chỉ email chưa tồn tại mới nhận được lời mời tạo tài khoản.</p><va-alert v-if="checkMessage" :color="checkColor" class="form-alert">{{ checkMessage }}</va-alert>
    <form @submit.prevent="sendInvite">
      <va-select v-model="farmId" label="Trại" :options="farms" text-by="name" value-by="id" class="form-field" required @update:model-value="selectFarm" />
      <va-input v-model="email" label="Email người dùng mới" type="email" class="form-field" required @update:model-value="emailAvailable = false" @blur="checkEmail" />
      <va-select v-model="role" label="Quyền" :options="[{ text: 'Quản lý trại', value: 'manager' }, { text: 'Nhân viên', value: 'staff' }, { text: 'Chỉ xem', value: 'viewer' }]" text-by="text" value-by="value" class="form-field" />
      <div class="actions"><va-button type="button" preset="secondary" :loading="loading" @click="checkEmail">Kiểm tra email</va-button><va-button type="submit" :loading="sending" :disabled="!canSubmit">Gửi lời mời</va-button><va-button type="button" preset="secondary" @click="router.push('/dashboard')">Quay lại</va-button></div>
    </form>
    <section v-if="farmId" class="form-field"><h3>Lời mời đang chờ</h3><va-list v-if="pendingInvitations.length"><va-list-item v-for="invitation in pendingInvitations" :key="invitation.id"><va-list-item-section><va-list-item-label>{{ invitation.email }}</va-list-item-label><va-list-item-label caption>{{ invitation.role }} · hết hạn {{ new Date(invitation.expiresAt).toLocaleDateString() }}</va-list-item-label></va-list-item-section><va-button color="danger" size="small" @click="revokeInvitation(invitation.id)">Thu hồi</va-button></va-list-item></va-list><p v-else class="muted">Không có lời mời đang chờ.</p></section>
  </va-card-content></va-card></main>
</template>
