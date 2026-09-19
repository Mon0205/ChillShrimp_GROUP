<script setup>
import { computed, onMounted, ref } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { loadFarmContext, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'

const farmContext = useFarmContext()
const loading = ref(true)
const error = ref('')
const roleNames = { owner: 'Chủ trại', area_manager: 'Quản lý khu vực', technician: 'Nhân viên kỹ thuật', warehouse_staff: 'Nhân viên kho' }
const farms = computed(() => farmContext.farms)
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmContext.farmId))
const selectedRole = computed(() => roleNames[selectedFarm.value?.role] || 'Chưa xác định')
const selectedScope = computed(() => selectedFarm.value?.area?.name || 'Toàn trại')

async function loadDashboard() {
  try { await loadFarmContext(true) }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
  finally { loading.value = false }
}

onMounted(loadDashboard)
</script>

<template>
  <AppShell>
    <header class="page-header">
      <div>
        <span class="eyebrow">TỔNG QUAN VẬN HÀNH</span>
        <h1>Dashboard</h1>
        <p>Tổng quan về các trang trại và phạm vi làm việc của bạn.</p>
      </div>
      <div class="page-actions">
        <v-btn to="/farms" color="primary" variant="outlined">Quản lý trang trại</v-btn>
        <v-btn to="/users" color="primary">Quản lý người dùng</v-btn>
      </div>
    </header>

    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />
    <div v-else-if="error" class="notice error-notice">Không thể tải thông tin tổng quan.</div>
    <template v-else-if="farms.length">
      <section class="metrics-grid">
        <v-card class="metric-card" elevation="0"><span>Trang trại tham gia</span><strong>{{ farms.length }}</strong><small>Membership đang hoạt động</small></v-card>
        <v-card class="metric-card" elevation="0"><span>Farm đang chọn</span><strong>{{ selectedFarm?.code || '—' }}</strong><small>{{ selectedFarm?.name || 'Chưa chọn trang trại' }}</small></v-card>
        <v-card class="metric-card" elevation="0"><span>Vai trò hiện tại</span><strong class="metric-role">{{ selectedRole }}</strong><small>Phạm vi: {{ selectedScope }}</small></v-card>
      </section>

      <v-card class="overview-card" elevation="0">
        <div class="overview-heading"><div><span class="eyebrow">FARM ĐANG LÀM VIỆC</span><h2>{{ selectedFarm?.name || 'Chưa chọn trang trại' }}</h2></div><span class="farm-code">{{ selectedFarm?.code || '—' }}</span></div>
        <div class="overview-grid">
          <div><span class="detail-label">Địa chỉ</span><strong>{{ selectedFarm?.address || 'Chưa cập nhật' }}</strong></div>
          <div><span class="detail-label">Phạm vi</span><strong>{{ selectedScope }}</strong></div>
          <div><span class="detail-label">Quyền truy cập</span><strong>{{ selectedRole }}</strong></div>
        </div>
        <div class="overview-actions"><v-btn to="/farms" color="primary" variant="text">Xem thông tin farm</v-btn><v-btn to="/users" color="primary" variant="text">Xem thành viên</v-btn></div>
      </v-card>
    </template>
    <v-card v-else class="empty-card" elevation="0">
      <div class="empty-icon">+</div><h2>Chưa có trang trại</h2><p>Tạo trang trại đầu tiên để bắt đầu quản lý dữ liệu vận hành.</p><v-btn to="/farms" color="primary">Mở quản lý trang trại</v-btn>
    </v-card>
  </AppShell>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:26px}.page-header p{margin:0;color:#70817e;font-size:13px}.page-actions{display:flex;gap:10px}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.13em}h1{margin:0 0 9px;color:#134e4a;font-size:clamp(1.85rem,3vw,2.55rem)}h2{margin:0;color:#134e4a;font-size:1.25rem}.notice{padding:16px;border-radius:12px;font-size:13px}.error-notice{color:#9b3e3e;background:#fff0ef}.metrics-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.metric-card,.overview-card,.empty-card{border:1px solid #dce7e4!important;border-radius:18px!important;background:white!important}.metric-card{display:grid;gap:8px;padding:22px}.metric-card span,.detail-label{color:#82908d;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.metric-card strong{color:#087f6e;font-size:28px}.metric-card small{color:#74837f;font-size:11px}.metric-role{font-size:18px!important}.overview-card{margin-top:20px;padding:26px}.overview-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding-bottom:20px;border-bottom:1px solid #e5ecea}.farm-code{padding:6px 10px;border-radius:8px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.overview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;padding:22px 0}.overview-grid div{display:grid;gap:7px}.overview-grid strong{color:#365751;font-size:13px}.overview-actions{display:flex;justify-content:flex-end;gap:4px}.empty-card{padding:46px;text-align:center}.empty-icon{width:48px;height:48px;display:grid;place-items:center;margin:0 auto 14px;border-radius:14px;color:#087f6e;background:#e7f4f1;font-size:25px}.empty-card p{margin:8px 0 20px;color:#70817e;font-size:13px}@media(max-width:760px){.page-header{align-items:stretch;flex-direction:column}.page-actions .v-btn{flex:1}.metrics-grid,.overview-grid{grid-template-columns:1fr}.overview-actions{justify-content:stretch;flex-direction:column}.empty-card{padding:34px 22px}}
</style>
