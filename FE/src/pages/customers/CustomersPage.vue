<script setup>
import { computed, ref, watch } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { useFarmContext } from '../../composables/farm-context.js'
import { api } from '../../services/api.js'
import { showToast } from '../../composables/toast.js'

const context = useFarmContext()
const farm = computed(() => context.farms.find(f => f.id === context.farmId))
const allowed = computed(() => farm.value?.role === 'owner' && farm.value?.status !== 'archived')
const types = [{ title: 'Trang trại', value: 'farm' }, { title: 'Hộ nuôi', value: 'household' }, { title: 'Hợp tác xã', value: 'cooperative' }, { title: 'Khác', value: 'other' }]
const label = value => types.find(t => t.value === value)?.title || value
const items = ref([]), q = ref(''), type = ref(''), page = ref(1), pages = ref(0), total = ref(0)
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
    const params = new URLSearchParams({ q: q.value || '', customerType: type.value || '', page: String(page.value), limit: '10' })
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
    <header><div><h1>Khách hàng</h1><p>Hồ sơ khách mua giống tại {{ farm?.name || 'trại đang chọn' }}</p></div><v-btn v-if="allowed" color="primary" prepend-icon="mdi-plus" @click="edit()">Thêm khách hàng</v-btn></header>
    <v-alert v-if="!allowed" type="info" variant="tonal">Chọn một trại đang hoạt động mà bạn có quyền Owner để quản lý khách hàng.</v-alert>
    <template v-else>
      <v-card class="pa-5" variant="outlined">
        <form class="filters" @submit.prevent="search">
          <v-text-field v-model="q" label="Tên hoặc số điện thoại" maxlength="150" hide-details clearable @click:clear="q = ''; search()" />
          <v-select v-model="type" :items="types" label="Loại khách" hide-details clearable @update:model-value="search" />
          <v-btn type="submit" :disabled="loading">Tìm kiếm</v-btn>
        </form>
        <v-alert v-if="error" type="error" class="my-4">{{ error }} <v-btn variant="text" @click="load">Thử lại</v-btn></v-alert>
        <v-progress-linear v-if="loading" indeterminate class="my-4" />
        <v-table v-else-if="!error">
          <thead><tr><th>Tên khách</th><th>Điện thoại</th><th>Loại</th><th>Địa chỉ</th><th>Thao tác</th></tr></thead>
          <tbody><tr v-for="item in items" :key="item.id"><td>{{ item.name }}</td><td>{{ item.phone || '—' }}</td><td>{{ label(item.customerType) }}</td><td>{{ item.address || '—' }}</td><td class="actions"><v-btn size="small" variant="text" @click="view(item)">Xem</v-btn><v-btn size="small" variant="text" @click="edit(item)">Sửa</v-btn><v-btn size="small" color="error" variant="text" @click="deleting = item">Xóa</v-btn></td></tr>
          <tr v-if="!items.length"><td colspan="5" class="text-center pa-6">Chưa có khách hàng phù hợp.</td></tr></tbody>
        </v-table>
        <div class="pagination"><span>{{ total }} khách hàng</span><v-pagination v-if="pages > 1" v-model="page" :length="pages" :total-visible="5" /></div>
      </v-card>
    </template>
    <v-dialog v-model="dialog" max-width="600" :persistent="saving"><v-card class="pa-6"><h2>{{ editing ? 'Sửa khách hàng' : 'Thêm khách hàng' }}</h2><v-form ref="formRef" @submit.prevent="save">
      <v-text-field v-model="form.name" label="Tên khách hàng *" :rules="[v => !!String(v || '').trim() || 'Nhập tên khách hàng', max(150)]" maxlength="150" />
      <v-text-field v-model="form.phone" label="Số điện thoại" :rules="[max(20), phoneRule]" maxlength="20" />
      <v-select v-model="form.customerType" label="Loại khách hàng *" :items="types" :rules="[v => types.some(t => t.value === v) || 'Chọn loại khách hàng']" />
      <v-textarea v-model="form.address" label="Địa chỉ" rows="2" :rules="[max(4000)]" maxlength="4000" />
      <v-textarea v-model="form.notes" label="Ghi chú" rows="3" :rules="[max(4000)]" maxlength="4000" />
      <v-card-actions><v-spacer /><v-btn :disabled="saving" @click="dialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="saving">Lưu</v-btn></v-card-actions>
    </v-form></v-card></v-dialog>
    <v-dialog :model-value="!!detail" max-width="600" @update:model-value="detail = null"><v-card v-if="detail" class="pa-6"><h2>{{ detail.name }}</h2><dl><dt>Loại</dt><dd>{{ label(detail.customerType) }}</dd><dt>Điện thoại</dt><dd>{{ detail.phone || '—' }}</dd><dt>Địa chỉ</dt><dd>{{ detail.address || '—' }}</dd><dt>Ghi chú</dt><dd>{{ detail.notes || '—' }}</dd><dt>Ngày tạo</dt><dd>{{ new Date(detail.createdAt).toLocaleString('vi-VN') }}</dd><dt>Cập nhật</dt><dd>{{ new Date(detail.updatedAt).toLocaleString('vi-VN') }}</dd></dl><v-alert type="info" variant="tonal">Lịch sử mua sẽ được bổ sung khi chức năng xuất bán giống được triển khai.</v-alert><v-card-actions><v-spacer /><v-btn @click="detail = null">Đóng</v-btn></v-card-actions></v-card></v-dialog>
    <v-dialog :model-value="!!deleting" max-width="450" :persistent="saving" @update:model-value="deleting = null"><v-card class="pa-6"><h2>Xóa khách hàng?</h2><p>Khách {{ deleting?.name }} sẽ được ẩn khỏi danh sách. Hồ sơ được giữ để bảo toàn lịch sử.</p><v-card-actions><v-spacer /><v-btn :disabled="saving" @click="deleting = null">Hủy</v-btn><v-btn color="error" :loading="saving" @click="remove">Xóa</v-btn></v-card-actions></v-card></v-dialog>
  </AppShell>
</template>

<style scoped>
header{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:24px}h1,h2{color:#134e4a;margin-bottom:12px}p{color:#647975}.filters{display:flex;align-items:center;gap:12px;margin-bottom:20px}.filters>*{flex:1}.filters>.v-btn{flex:0}.pagination{display:flex;justify-content:space-between;align-items:center;margin-top:16px}.actions{white-space:nowrap}td,dd{overflow-wrap:anywhere}dt{font-weight:700;margin-top:12px}dd{margin:6px 0 16px;white-space:pre-wrap}@media(max-width:650px){header,.filters{flex-direction:column;align-items:stretch}}
</style>
