<script setup>
import { computed, ref, watch } from 'vue'
import Pagination from '../../components/pagination/index.vue'
import AppShell from '../../components/shell/index.vue'
import { useFarmContext } from '../../composables/farm-context.js'
import { api } from '../../services/api.js'
import { showToast } from '../../composables/toast.js'

const context = useFarmContext()
const farm = computed(() => context.farms.find(f => f.id === context.farmId))
const allowed = computed(() => farm.value?.role === 'owner' && farm.value?.status !== 'archived')
const types = [{ title: 'Trang trại', value: 'farm' }, { title: 'Hộ nuôi', value: 'household' }, { title: 'Hợp tác xã', value: 'cooperative' }, { title: 'Khác', value: 'other' }]
const label = value => types.find(t => t.value === value)?.title || value
const formatDate = value => value ? new Date(value).toLocaleString('vi-VN') : '?'
const items = ref([]), q = ref(''), type = ref(''), page = ref(1), pages = ref(0), total = ref(0)
const limit = ref(10)
const loading = ref(false), saving = ref(false), error = ref('')
const dialog = ref(false), detail = ref(null), deleting = ref(null), editing = ref(null), formRef = ref(null)
const blank = () => ({ name: '', phone: '', address: '', customerType: 'household', notes: '' })
const form = ref(blank())
let version = 0
const base = id => `/farms/${encodeURIComponent(id)}/customers`
async function load() {
  const token = ++version, id = context.farmId
  items.value = []; error.value = ''; loading.value = false
  if (!id || !allowed.value) return
  loading.value = true
  try {
    const params = new URLSearchParams({ q: q.value || '', customerType: type.value || '', page: String(page.value), limit: String(limit.value) })
    const { data } = await api(`${base(id)}?${params}`)
    if (token !== version) return
    if (page.value > Math.max(1, data.pagination.pageCount)) { page.value = Math.max(1, data.pagination.pageCount); return }
    items.value = data.items; pages.value = data.pagination.pageCount; total.value = data.pagination.total
  } catch (e) { if (token === version) error.value = e.message }
  finally { if (token === version) loading.value = false }
}
function search() { if (page.value !== 1) page.value = 1; else void load() }
watch([() => context.farmId, allowed], () => {
  dialog.value = false; detail.value = null; deleting.value = null; editing.value = null
  q.value = ''; type.value = ''; page.value = 1; total.value = 0; pages.value = 0
  void load()
}, { immediate: true })
watch(page, load)
watch(limit, search)
function edit(item = null) {
  editing.value = item?.id || null
  form.value = item ? Object.fromEntries(Object.keys(blank()).map(k => [k, item[k] ?? ''])) : blank()
  dialog.value = true
}
async function save() {
  if (saving.value || !(await formRef.value.validate()).valid) return
  const id = context.farmId, customerId = editing.value
  saving.value = true
  try {
    await api(base(id) + (customerId ? `/${customerId}` : ''), { method: customerId ? 'PATCH' : 'POST', body: JSON.stringify(form.value) })
    if (id !== context.farmId) return
    dialog.value = false; showToast('Đã lưu khách hàng', 'success'); await load()
  } catch (e) { if (id === context.farmId) showToast(e.message, 'error') }
  finally { saving.value = false }
}
async function view(item) {
  const id = context.farmId, token = version
  try { const { data } = await api(`${base(id)}/${item.id}`); if (token === version && id === context.farmId) detail.value = data }
  catch (e) { if (id === context.farmId) showToast(e.message, 'error') }
}
async function remove() {
  if (saving.value || !deleting.value) return
  const id = context.farmId, customerId = deleting.value.id
  saving.value = true
  try {
    await api(`${base(id)}/${customerId}`, { method: 'DELETE' })
    if (id !== context.farmId) return
    deleting.value = null; showToast('Đã xóa khách hàng khỏi danh sách', 'success'); await load()
  } catch (e) { if (id === context.farmId) showToast(e.message, 'error') }
  finally { saving.value = false }
}
const max = n => v => String(v ?? '').trim().length <= n || `Tối đa ${n} ký tự`
const phoneRule = v => !String(v ?? '').trim() || (/^[+()\d.\-\s]+$/.test(v.trim()) && /\d/.test(v)) || 'Số điện thoại không hợp lệ'
</script>

<template>
  <AppShell>
    <header class="page-header">
      <div class="section-page-title">
        <v-avatar color="primary" variant="tonal" rounded="lg" size="44"><v-icon icon="mdi-account-group-outline" size="25" /></v-avatar>
        <h1>Khách hàng</h1>
      </div>
    </header>
    <div v-if="allowed" class="page-actions list-actions">
      <v-btn color="primary" prepend-icon="mdi-plus" @click="edit()">Thêm khách hàng</v-btn>
    </div>
    <div v-if="!allowed" class="permission-empty">Chọn một trại đang hoạt động mà bạn có quyền chủ trại để quản lý khách hàng.</div>
    <v-card v-else class="list-card" elevation="0">
      <form class="list-toolbar" @submit.prevent="search">
        <div class="list-filters">
          <v-select v-model="type" :items="types" label="Loại khách hàng" density="compact" variant="outlined" hide-details clearable @update:model-value="search" />
        </div>
        <v-text-field v-model="q" class="list-search" placeholder="Tên hoặc số điện thoại" aria-label="Tìm khách hàng theo tên hoặc số điện thoại" prepend-inner-icon="mdi-magnify" maxlength="150" density="compact" variant="outlined" hide-details clearable @click:clear="q = ''; search()" />
        <v-btn type="submit" variant="tonal" color="primary" :disabled="loading">Tìm kiếm</v-btn>
      </form>
      <v-progress-linear v-if="loading" indeterminate color="primary" rounded />
      <div v-else-if="error" class="notice error-notice" role="alert">
        <span>{{ error }}</span><v-btn variant="text" color="error" @click="load">Thử lại</v-btn>
      </div>
      <div v-else-if="!items.length" class="empty-state">
        <v-avatar color="primary" variant="tonal" rounded="lg" size="48"><v-icon :icon="q || type ? 'mdi-account-search-outline' : 'mdi-account-group-outline'" /></v-avatar>
        <strong>{{ q || type ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng' }}</strong>
        <p>{{ q || type ? 'Thử từ khóa hoặc loại khách hàng khác.' : 'Thêm hồ sơ khách mua giống tại trại đang chọn.' }}</p>
        <v-btn v-if="!q && !type" color="primary" variant="outlined" size="small" @click="edit()">Thêm khách hàng</v-btn>
      </div>
      <div v-else class="table-wrap">
        <table class="app-data-table">
          <thead><tr><th>Khách hàng</th><th>Điện thoại</th><th>Loại khách</th><th>Địa chỉ</th><th class="actions-heading">Thao tác</th></tr></thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td><div class="customer-identity"><v-avatar color="primary" variant="tonal" rounded="lg" size="36">{{ item.name.slice(0, 1).toUpperCase() }}</v-avatar><strong>{{ item.name }}</strong></div></td>
              <td class="phone-cell">{{ item.phone || '—' }}</td>
              <td><v-chip color="primary" variant="tonal" size="small">{{ label(item.customerType) }}</v-chip></td>
              <td class="address-cell">{{ item.address || '—' }}</td>
              <td><div class="row-actions">
                <v-btn icon="mdi-eye-outline" variant="text" size="small" :aria-label="`Xem khách hàng ${item.name}`" title="Xem chi tiết" @click="view(item)" />
                <v-btn icon="mdi-pencil-outline" variant="text" size="small" :aria-label="`Sửa khách hàng ${item.name}`" title="Cập nhật" @click="edit(item)" />
                <v-btn icon="mdi-trash-can-outline" variant="text" size="small" color="error" class="text-error" :aria-label="`Xóa khách hàng ${item.name}`" title="Xóa khách hàng" @click="deleting = item" />
              </div></td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination v-if="!error" v-model:page="page" v-model:page-size="limit" :total="total" :loading="loading" />
    </v-card>

    <v-dialog v-model="dialog" max-width="640" :persistent="saving">
      <v-card class="form-card">
        <v-card-title>{{ editing ? 'Cập nhật khách hàng' : 'Thêm khách hàng' }}</v-card-title>
        <v-card-text>
          <v-form id="customer-form" ref="formRef" class="dialog-form" validate-on="blur" @submit.prevent="save">
            <v-text-field v-model="form.name" label="Tên khách hàng *" :rules="[v => !!String(v || '').trim() || 'Nhập tên khách hàng', max(150)]" maxlength="150" counter="150" variant="outlined" hide-details="auto" />
            <div class="field-grid">
              <v-text-field v-model="form.phone" label="Số điện thoại" :rules="[max(20), phoneRule]" maxlength="20" variant="outlined" hide-details="auto" />
              <v-select v-model="form.customerType" label="Loại khách hàng *" :items="types" :rules="[v => types.some(t => t.value === v) || 'Chọn loại khách hàng']" variant="outlined" hide-details="auto" />
            </div>
            <v-textarea v-model="form.address" label="Địa chỉ" rows="2" auto-grow :rules="[max(4000)]" maxlength="4000" variant="outlined" hide-details="auto" />
            <v-textarea v-model="form.notes" label="Ghi chú" rows="3" auto-grow :rules="[max(4000)]" maxlength="4000" variant="outlined" hide-details="auto" />
          </v-form>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn :disabled="saving" @click="dialog = false">Hủy</v-btn><v-btn type="submit" form="customer-form" color="primary" variant="flat" :loading="saving">Lưu khách hàng</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="!!detail" max-width="640" @update:model-value="detail = null">
      <v-card v-if="detail" class="form-card">
        <v-card-title>Thông tin khách hàng</v-card-title>
        <v-card-text>
          <div class="customer-identity detail-identity"><v-avatar color="primary" variant="tonal" rounded="lg" size="44">{{ detail.name.slice(0, 1).toUpperCase() }}</v-avatar><h2>{{ detail.name }}</h2></div>
          <dl class="detail-grid">
            <div><dt>Loại khách</dt><dd>{{ label(detail.customerType) }}</dd></div>
            <div><dt>Điện thoại</dt><dd>{{ detail.phone || '—' }}</dd></div>
            <div class="detail-wide"><dt>Địa chỉ</dt><dd>{{ detail.address || '—' }}</dd></div>
            <div class="detail-wide"><dt>Ghi chú</dt><dd>{{ detail.notes || '—' }}</dd></div>
            <div><dt>Ngày tạo</dt><dd>{{ formatDate(detail.createdAt) }}</dd></div>
            <div><dt>Cập nhật</dt><dd>{{ formatDate(detail.updatedAt) }}</dd></div>
          </dl>
          <v-alert type="info" variant="tonal" class="mt-4">Lịch sử mua sẽ được bổ sung khi chức năng xuất bán giống được triển khai.</v-alert>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="detail = null">Đóng</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="!!deleting" max-width="450" :persistent="saving" @update:model-value="deleting = null">
      <v-card class="dialog-card">
        <h2>Xóa khách hàng?</h2>
        <p>Khách {{ deleting?.name }} sẽ được ẩn khỏi danh sách. Hồ sơ được giữ để bảo toàn lịch sử.</p>
        <div class="dialog-actions"><v-btn :disabled="saving" @click="deleting = null">Hủy</v-btn><v-btn color="error" variant="flat" :loading="saving" @click="remove">Xóa khách hàng</v-btn></div>
      </v-card>
    </v-dialog>
  </AppShell>
</template>

<style scoped>
.list-card { border: 1px solid var(--ui-border); }
.list-toolbar { margin-top: 0 !important; }
.customer-identity { display: flex; align-items: center; gap: 12px; min-width: 200px; }
.customer-identity .v-avatar { flex-shrink: 0; font-size: 14px; font-weight: 700; }
.customer-identity strong { overflow-wrap: anywhere; }
.phone-cell { white-space: nowrap; }
.address-cell { min-width: 180px; max-width: 300px; overflow-wrap: anywhere; }
.actions-heading { text-align: right; }
.row-actions { display: flex; justify-content: flex-end; }
.empty-state { min-height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: var(--ui-muted); text-align: center; }
.empty-state strong { color: var(--ui-text); }
.empty-state p { margin: 0; }
.notice { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; border-radius: 10px; }
.error-notice { color: #9b3e3e; background: #fff4f3; }
.dialog-form { display: grid; gap: 16px; padding-top: 8px; }
.field-grid, .detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.detail-identity h2 { margin: 0; font-size: 19px; color: var(--ui-text); overflow-wrap: anywhere; }
.detail-grid { margin: 24px 0 0; }
.detail-grid > div { padding-bottom: 12px; border-bottom: 1px solid var(--ui-border); }
.detail-grid dt { color: var(--ui-muted); font-size: 12px; margin-bottom: 6px; }
.detail-grid dd { margin: 0; color: var(--ui-text); font-size: 14px; white-space: pre-wrap; overflow-wrap: anywhere; }
.detail-wide { grid-column: 1 / -1; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 600px) { .field-grid, .detail-grid { grid-template-columns: 1fr; } .detail-wide { grid-column: auto; } }
</style>
