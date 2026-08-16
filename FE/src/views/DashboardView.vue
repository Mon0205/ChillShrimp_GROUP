<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authState, signOut } from '../composables/auth.js'
import { farmService } from '../services/farm.service.js'

const router = useRouter()
const farms = ref([])
const message = ref('')

onMounted(async () => {
  try {
    farms.value = await farmService.list()
  } catch (error) {
    message.value = error.message || 'Không thể tải danh sách trại'
  }
})

async function logout() {
  await signOut()
  await router.replace('/login')
}
</script>

<template>
  <va-layout class="app-layout">
    <template #top>
      <va-navbar color="primary">
        <va-navbar-item class="brand">ChillShrimp</va-navbar-item>
        <div class="nav-actions">
          <va-button preset="secondary" @click="router.push('/admin/invitations')">Mời thành viên</va-button>
          <va-button preset="secondary" @click="logout">Đăng xuất</va-button>
        </div>
      </va-navbar>
    </template>

    <main class="dashboard">
      <h1>Xin chào, {{ authState.user?.email }}</h1>
      <p class="muted">Bạn chỉ nhìn thấy dữ liệu của các trại đã được cấp quyền.</p>
      <va-alert v-if="message" color="danger">{{ message }}</va-alert>
      <section class="feature-grid">
        <va-card v-for="farm in farms" :key="farm.id">
          <va-card-title>{{ farm.name }}</va-card-title>
          <va-card-content>{{ farm.address || 'Chưa cập nhật địa chỉ' }}</va-card-content>
        </va-card>
        <va-card v-if="farms.length === 0">
          <va-card-title>Chưa có trại</va-card-title>
          <va-card-content>Quản trị viên cần cấp quyền hoặc tạo trại cho bạn.</va-card-content>
        </va-card>
      </section>
    </main>
  </va-layout>
</template>

<style scoped>
.nav-actions {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
  padding-right: 1rem;
}
</style>
