<script setup>
import SectionTabs from '../../components/section-tabs/index.vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '../../components/shell/index.vue'
import Pagination from '../../components/pagination/index.vue'
import { useAuth } from '../../composables/auth.js'
import { useFarmContext } from '../../composables/farm-context.js'
import { api } from '../../services/api.js'
const context = useFarmContext()
const auth = useAuth()
const route = useRoute()
const customersMode = computed(() => route.path === '/customers')
const role = computed(() => context.farms.find(f => f.id === context.farmId)?.role)
const canView = computed(() => Boolean(auth.user?.id) && ['owner', 'farm_manager', 'area_manager'].includes(role.value))
const wholeFarm = computed(() => ['owner', 'farm_manager'].includes(role.value))
const rows = ref([]), total = ref(0), page = ref(1), pageSize = ref(10), search = ref(''), status = ref('')
const loading = ref(false), saving = ref(false), error = ref(''), actionError = ref('')
const detail = ref(null), detailLoading = ref(false), detailOpen = ref(false), editor = ref(false), customerEditor = ref(false)
const form = ref({}), customerForm = ref({}), deliveryRows = ref({}), payment = ref({ amount: '', method: 'cash' }), deliveryNotes = ref(''), paymentNotes = ref(''), reason = ref('')
const customerOptions = ref([]), batchOptions = ref([]), customerSearch = ref(''), batchSearch = ref(''), optionError = ref(''), optionsLoading = ref(false)
const knownBatches = ref([]), knownCustomers = ref([])
const selectedBatchOptions = computed(() => [...batchOptions.value, ...knownBatches.value.filter(b => form.value.items?.some(i => i.batchId === b.id) && !batchOptions.value.some(i => i.id === b.id))])
const selectedCustomerOptions = computed(() => [...customerOptions.value, ...knownCustomers.value.filter(c => c.id === form.value.customerId && !customerOptions.value.some(i => i.id === c.id))])
const batchPage = ref(1), customerPage = ref(1), batchTotal = ref(0), customerTotal = ref(0)
const names = { draft: 'Nháp', confirmed: 'Đã xác nhận', partially_delivered: 'Giao một phần', delivered: 'Đã giao đủ', completed: 'Hoàn tất', cancelled: 'Đã hủy' }
const pageMetrics = computed(() => {
 const active = rows.value.filter(row => ['confirmed', 'partially_delivered', 'delivered'].includes(row.status))
 return { active: active.length, waitingDelivery: active.filter(row => deliveredQuantity(row) < orderedQuantity(row)).length, waitingPayment: active.filter(row => row.paymentStatus !== 'paid').length, drafts: rows.value.filter(row => row.status === 'draft').length }
})
const editorStep = ref(1), detailTab = ref('items')
const statusColors = { draft: 'default', confirmed: 'info', partially_delivered: 'info', delivered: 'success', completed: 'success', cancelled: 'error' }
const creatorName = order => order?.creator?.displayName || order?.creator?.email || order?.createdBy || '—'
const initials = name => String(name || '').trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase()
const quantity = value => Number(value || 0).toLocaleString('vi-VN')
const orderedQuantity = order => (order?.items || []).reduce((sum, item) => sum + item.quantity, 0)
const deliveredQuantity = order => (order?.items || []).reduce((sum, item) => sum + item.deliveredQuantity, 0)
const deliveryPercent = order => orderedQuantity(order) ? Math.min(100, deliveredQuantity(order) / orderedQuantity(order) * 100) : 0
const deliveryName = order => deliveredQuantity(order) === 0 ? 'Chưa giao' : deliveredQuantity(order) < orderedQuantity(order) ? 'Giao một phần' : 'Đã giao đủ'
const selectedCustomer = computed(() => selectedCustomerOptions.value.find(customer => customer.id === form.value.customerId))
const batchName = id => selectedBatchOptions.value.find(batch => batch.id === id)?.batchCode || id
function lineAmount(item) {
 if (!positive(item.quantity) || !decimal(item.unitPrice)) return null
 const [whole, fraction = ''] = String(item.unitPrice).split('.')
 const cents = BigInt(item.quantity) * (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')))
 return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}
const draftTotal = computed(() => {
 const amounts = (form.value.items || []).map(lineAmount)
 if (!amounts.length || amounts.some(amount => amount === null)) return null
 const total = amounts.reduce((sum, amount) => sum + BigInt(amount.replace('.', '')), 0n)
 return `${total / 100n}.${String(total % 100n).padStart(2, '0')}`
})
const payNames = { unpaid: 'Chưa thu', partial: 'Thu một phần', paid: 'Đã thu đủ' }
const canDeliver = computed(() => canView.value && ['confirmed', 'partially_delivered'].includes(detail.value?.status))
const canPay = computed(() => wholeFarm.value && ['confirmed', 'partially_delivered', 'delivered'].includes(detail.value?.status) && detail.value?.paymentStatus !== 'paid')
const canCancel = computed(() => detail.value && (detail.value.status === 'draft' || wholeFarm.value && detail.value.status === 'confirmed') && !(detail.value.deliveries?.length) && !(detail.value.payments?.length))
let listController, detailController, actionController, optionsController
let attempts = {}
let actionStatus = 0
const root = () => `/farms/${encodeURIComponent(context.farmId)}`
const resource = () => customersMode.value ? 'customers' : 'sales-orders'
const money = value => { if (value == null) return '—'; const [whole, fraction] = String(value).split('.'); return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${fraction ? ',' + fraction : ''} VND` }
const date = value => value ? new Date(value).toLocaleString('vi-VN') : '—'
const positive = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 2147483647
const decimal = value => /^\d{1,16}(\.\d{1,2})?$/.test(String(value))
async function loadList() {
 listController?.abort(); const current = listController = new AbortController()
 if (!context.farmId || !canView.value) return
 loading.value = true; error.value = ''
 const query = new URLSearchParams({ q: search.value || '', page: String(page.value), limit: String(pageSize.value) })
 if (!customersMode.value && status.value) query.set('status', status.value)
 try {
  const result = await api(`${root()}/${resource()}?${query}`, { signal: current.signal })
  if (current.signal.aborted) return
  total.value = result.data.pagination.total
  const last = Math.max(1, Math.ceil(total.value / pageSize.value))
  if (page.value > last) { page.value = last; return }
  rows.value = result.data.items
 } catch (err) { if (!current.signal.aborted) { error.value = err.message; rows.value = []; total.value = 0 } }
 finally { if (!current.signal.aborted) loading.value = false }
}
async function loadOptions() {
 optionsController?.abort(); const current = optionsController = new AbortController()
 if (!canView.value || !editor.value) return
 optionsLoading.value = true; optionError.value = ''
 try {
  const [customers, batches] = await Promise.all([
   api(`${root()}/customers?${new URLSearchParams({ q: customerSearch.value, page: String(customerPage.value), limit: '25' })}`, { signal: current.signal }),
   api(`${root()}/sales-orders/batches?${new URLSearchParams({ q: batchSearch.value, page: String(batchPage.value), limit: '25' })}`, { signal: current.signal }),
  ])
  if (current.signal.aborted) return
  knownCustomers.value = [...new Map([...knownCustomers.value, ...customers.data.items].map(i => [i.id, i])).values()]
  knownBatches.value = [...new Map([...knownBatches.value, ...batches.data.items].map(i => [i.id, i])).values()]
  customerOptions.value = customers.data.items; customerTotal.value = customers.data.pagination.total
  batchOptions.value = batches.data.items; batchTotal.value = batches.data.pagination.total
 } catch (err) { if (!current.signal.aborted) optionError.value = err.message }
 finally { if (!current.signal.aborted) optionsLoading.value = false }
}
async function openDetail(id) {
 detailController?.abort(); const current = detailController = new AbortController()
 detail.value = null; detailOpen.value = true; detailLoading.value = true; actionError.value = ''; detailTab.value = 'items'
 deliveryRows.value = {}; payment.value = { amount: '', method: 'cash' }; deliveryNotes.value = ''; paymentNotes.value = ''; reason.value = ''
 try { const result = await api(`${root()}/sales-orders/${encodeURIComponent(id)}`, { signal: current.signal }); if (!current.signal.aborted) detail.value = result.data }
 catch (err) { if (!current.signal.aborted) actionError.value = err.message }
 finally { if (!current.signal.aborted) detailLoading.value = false }
}
function openCreate() {
 editorStep.value = 1; actionError.value = ''; customerSearch.value = ''; batchSearch.value = ''; batchPage.value = 1; customerPage.value = 1
 form.value = { customerId: '', expectedDeliveryDate: '', notes: '', items: [{ batchId: '', quantity: '', unitPrice: '' }] }; editor.value = true; loadOptions()
}
function editDraft() {
 if (!canView.value || detail.value?.status !== 'draft') return
 const order = detail.value
 detailOpen.value = false
 knownCustomers.value = order.customer ? [order.customer] : []
 knownBatches.value = order.items.map(i => ({ ...i.batch, id: i.batchId }))
 openCreate()
 form.value = { id: order.id, customerId: order.customerId, expectedDeliveryDate: order.expectedDeliveryDate?.slice(0, 10) || '', notes: order.notes || '', items: order.items.map(i => ({ batchId: i.batchId, quantity: String(i.quantity), unitPrice: i.unitPrice })) }
}
async function mutate(path, body, method = 'POST') {
 if (saving.value || !canView.value) return null
 actionController?.abort(); const current = actionController = new AbortController(); saving.value = true; actionError.value = ''; actionStatus = 0
 try { const result = await api(`${root()}/${path}`, { method, body: JSON.stringify(body), signal: current.signal }); if (current.signal.aborted) return null; loadList(); return result.data }
 catch (err) { if (!current.signal.aborted) { actionError.value = err.message; actionStatus = err.status || 0 }; return null }
 finally { if (!current.signal.aborted) saving.value = false }
}
function validateDraft(step = 2) {
 const f = form.value
 if (!f.customerId) return 'Chọn khách hàng trước khi tiếp tục.'
 if (f.notes?.length > 4000) return 'Ghi chú tối đa 4.000 ký tự.'
 if (step < 2) return ''
 if (!f.items?.length || f.items.length > 100) return 'Chọn từ 1 đến 100 lô giống.'
 if (f.items.some(i => !i.batchId || !positive(i.quantity) || !decimal(i.unitPrice))) return 'Chọn lô, số lượng nguyên dương và đơn giá tối đa 2 số thập phân.'
 if (new Set(f.items.map(i => i.batchId)).size !== f.items.length) return 'Không chọn trùng lô giống.'
 return ''
}
function advanceEditor() {
 actionError.value = validateDraft(editorStep.value)
 if (!actionError.value && editorStep.value < 3) editorStep.value++
}
async function saveDraft() {
 const f = form.value
 actionError.value = validateDraft()
 if (actionError.value) return
 const result = await mutate(`sales-orders${f.id ? `/${f.id}` : ''}`, { customerId: f.customerId, expectedDeliveryDate: f.expectedDeliveryDate || null, notes: f.notes || null, items: f.items.map(i => ({ ...i, quantity: Number(i.quantity), unitPrice: String(i.unitPrice) })) }, f.id ? 'PATCH' : 'POST')
 if (result) { editor.value = false; detail.value = result; detailTab.value = 'items'; detailOpen.value = true }
}
function editCustomer(customer = {}) { customerForm.value = { id: customer.id, name: customer.name || '', phone: customer.phone || '', address: customer.address || '' }; actionError.value = ''; customerEditor.value = true }
async function saveCustomer() {
 const f = customerForm.value
 if (!f.name.trim() || f.name.length > 150 || f.phone.length > 30 || f.address.length > 4000) { actionError.value = 'Tên bắt buộc (tối đa 150), điện thoại tối đa 30, địa chỉ tối đa 4.000 ký tự.'; return }
 const result = await mutate(`customers${f.id ? `/${f.id}` : ''}`, { name: f.name.trim(), phone: f.phone.trim() || null, address: f.address.trim() || null }, f.id ? 'PATCH' : 'POST')
 if (result) customerEditor.value = false
}
async function changeStatus(action) {
 if (action === 'confirm' && (!wholeFarm.value || detail.value?.status !== 'draft')) return
 if (action === 'cancel' && !canCancel.value) return
 if (action === 'cancel' && (!reason.value.trim() || reason.value.length > 4000)) { actionError.value = 'Nhập lý do hủy từ 1 đến 4.000 ký tự.'; return }
 const result = await mutate(`sales-orders/${detail.value.id}/${action}`, action === 'cancel' ? { reason: reason.value.trim() } : {})
 if (result) { detail.value = result; detailTab.value = 'items' }
}
async function transact(kind) {
 if (!detail.value || saving.value || kind === 'deliveries' && !canDeliver.value || kind === 'payments' && !canPay.value) return
 const attemptKey = `${detail.value.id}:${kind}`
 if (!attempts[attemptKey]) {
  const transactionNotes = kind === 'deliveries' ? deliveryNotes.value : paymentNotes.value
  if (transactionNotes.length > 4000) { actionError.value = 'Ghi chú tối đa 4.000 ký tự.'; return }
  let body
  if (kind === 'deliveries') {
   const items = detail.value.items.filter(i => deliveryRows.value[i.id] !== '' && deliveryRows.value[i.id] != null && deliveryRows.value[i.id] !== '0')
   if (!items.length || items.some(i => !positive(deliveryRows.value[i.id]) || Number(deliveryRows.value[i.id]) > i.quantity - i.deliveredQuantity)) { actionError.value = 'Nhập lượng giao nguyên dương, không vượt lượng còn lại.'; return }
   body = { items: items.map(i => ({ orderItemId: i.id, quantity: Number(deliveryRows.value[i.id]) })) }
  } else {
   if (!decimal(payment.value.amount) || !/[1-9]/.test(payment.value.amount)) { actionError.value = 'Nhập số tiền dương, tối đa 2 số thập phân.'; return }
   body = { amount: String(payment.value.amount), method: payment.value.method }
  }
  attempts[attemptKey] = { ...body, notes: transactionNotes.trim() || null, idempotencyKey: crypto.randomUUID() }
 }
 const result = await mutate(`sales-orders/${detail.value.id}/${kind}`, attempts[attemptKey])
 if (!result && actionStatus >= 400 && actionStatus < 500) delete attempts[attemptKey]
 if (result) { detail.value = result; delete attempts[attemptKey]; deliveryRows.value = {}; payment.value.amount = ''; if (kind === 'deliveries') deliveryNotes.value = ''; else paymentNotes.value = '' }
}
function clearScope() {
 listController?.abort(); detailController?.abort(); actionController?.abort(); optionsController?.abort()
 rows.value = []; total.value = 0; detail.value = null; detailOpen.value = false; editor.value = false; customerEditor.value = false
 customerOptions.value = []; batchOptions.value = []; knownBatches.value = []; knownCustomers.value = []; form.value = {}; customerForm.value = {}; deliveryRows.value = {}; payment.value = { amount: '', method: 'cash' }; attempts = {}
 editorStep.value = 1; detailTab.value = 'items'; saving.value = false; loading.value = false; detailLoading.value = false; optionsLoading.value = false; error.value = ''; actionError.value = ''; optionError.value = ''; search.value = ''; status.value = ''; page.value = 1
 loadList()
}
watch([() => context.farmId, () => role.value, () => context.farms.find(f => f.id === context.farmId)?.area?.id, () => auth.user?.id, () => route.path], clearScope, { flush: 'sync' })
watch([page, search, status], loadList)
watch(pageSize, () => { if (page.value === 1) loadList(); else page.value = 1 })
watch([search, status], () => { page.value = 1 })
watch([customerSearch, batchSearch], () => { customerPage.value = 1; batchPage.value = 1; loadOptions() })
watch([customerPage, batchPage], loadOptions)
onBeforeUnmount(() => { listController?.abort(); detailController?.abort(); actionController?.abort(); optionsController?.abort() })
loadList()
</script>

<template>
 <AppShell>
  <section class="sales-page">
   <SectionTabs section="business" />
   <header class="page-heading">
    <div><span class="eyebrow">{{ customersMode ? 'DANH BẠ CỦA TRẠI' : 'KINH DOANH GIỐNG' }}</span><h1>{{ customersMode ? 'Khách hàng' : 'Bán tôm giống' }}</h1><p>{{ customersMode ? 'Thông tin liên hệ rõ ràng, thuận tiện lập đơn và giao giống.' : 'Quản lý đơn hàng, tiến độ giao giống và các khoản thu tại một nơi.' }}</p></div>
    <v-btn v-if="canView" color="primary" prepend-icon="mdi-plus" @click="customersMode ? editCustomer() : openCreate()">{{ customersMode ? 'Thêm khách hàng' : 'Tạo đơn bán giống' }}</v-btn>
   </header>
   <v-alert v-if="!canView" type="info" variant="tonal">Bạn cần chọn trang trại và có quyền quản lý để sử dụng bán giống.</v-alert>
   <div v-if="canView && !customersMode" class="page-overview" aria-label="Tổng hợp đơn trong trang hiện tại"><div class="overview-caption">TRONG TRANG HIỆN TẠI <span>Theo bộ lọc đang chọn</span></div><div class="overview-grid"><div class="overview-highlight"><small>Đang thực hiện</small><strong>{{ pageMetrics.active }}</strong><span>Đơn đã xác nhận, chưa hoàn tất</span></div><div><small>Chờ giao đủ</small><strong>{{ pageMetrics.waitingDelivery }}</strong><span>Đơn còn giống phải giao</span></div><div><small>Chưa thu đủ</small><strong class="amount-due">{{ pageMetrics.waitingPayment }}</strong><span>Đơn còn khoản phải thu</span></div><div><small>Đơn nháp</small><strong>{{ pageMetrics.drafts }}</strong><span>Chờ kiểm tra và xác nhận</span></div></div></div>
   <v-card v-if="canView" class="list-card" elevation="0">
    <div class="panel-heading"><h2>{{ customersMode ? 'Danh bạ khách hàng' : 'Đơn bán giống' }} <span class="count">{{ total }}</span></h2><v-btn icon="mdi-refresh" variant="text" size="small" :aria-label="customersMode ? 'Làm mới khách hàng' : 'Làm mới đơn bán giống'" :loading="loading" @click="loadList" /></div>
    <v-tabs v-if="!customersMode" v-model="status" color="primary" class="status-tabs" aria-label="Trạng thái đơn bán giống" show-arrows><v-tab value="">Tất cả</v-tab><v-tab v-for="(title,value) in names" :key="value" :value="value">{{ title }}</v-tab></v-tabs>
    <div class="list-toolbar"><v-text-field v-model="search" :label="customersMode ? 'Tìm tên hoặc số điện thoại khách hàng' : 'Tìm mã đơn, khách hàng hoặc số điện thoại'" prepend-inner-icon="mdi-magnify" clearable hide-details density="compact" /><span class="toolbar-caption">{{ customersMode ? 'Khách hàng trong trại hiện tại' : 'Người lập đơn là người phụ trách' }}</span></div>
    <v-progress-linear v-if="loading" indeterminate color="primary" aria-label="Đang tải" />
    <v-alert v-if="error" type="error" variant="tonal" class="ma-4">{{ error }}<v-btn variant="text" @click="loadList">Thử lại</v-btn></v-alert>
    <div v-else-if="!loading && !rows.length" class="empty"><v-icon :icon="customersMode ? 'mdi-account-search-outline' : 'mdi-clipboard-text-search-outline'" size="36" /><h3>Không có {{ customersMode ? 'khách hàng' : 'đơn bán giống' }} phù hợp</h3><p>{{ search || status ? 'Thử đổi từ khóa hoặc trạng thái lọc.' : customersMode ? 'Thêm khách hàng đầu tiên để bắt đầu lập đơn.' : 'Tạo đơn bán giống để theo dõi việc giao và thu tiền.' }}</p></div>
    <div v-else class="table-wrap" :aria-busy="loading"><v-table class="app-data-table sales-table"><thead><tr><template v-if="customersMode"><th>Khách hàng</th><th>Số điện thoại</th><th>Địa chỉ</th></template><template v-else><th>Đơn hàng / Khách hàng</th><th>Giao giống</th><th>Thanh toán</th><th>Người lập đơn</th><th>Trạng thái</th></template><th><span class="sr-only">Thao tác</span></th></tr></thead><tbody>
     <tr v-for="row in rows" :key="row.id"><template v-if="customersMode"><td><div class="person"><span class="initials">{{ initials(row.name) }}</span><strong>{{ row.name }}</strong></div></td><td>{{ row.phone || 'Chưa có số điện thoại' }}</td><td class="address">{{ row.address || 'Chưa có địa chỉ' }}</td></template><template v-else>
      <td><strong class="order-code">{{ row.orderCode }}</strong><small class="customer-name">{{ row.customerName || row.customer?.name || '—' }}</small><small>{{ date(row.createdAt) }} · {{ quantity(orderedQuantity(row)) }} con</small></td>
      <td><v-chip size="small" :color="deliveredQuantity(row) === 0 ? 'default' : deliveryPercent(row) === 100 ? 'success' : 'info'" variant="tonal">{{ deliveryName(row) }}</v-chip><small>{{ quantity(deliveredQuantity(row)) }} / {{ quantity(orderedQuantity(row)) }} con</small><v-progress-linear :model-value="deliveryPercent(row)" color="primary" bg-color="#e8eee6" height="4" rounded class="delivery-progress" :aria-label="`Tiến độ giao ${row.orderCode}`" /></td>
      <td><strong>{{ money(row.totalAmount) }}</strong><small :class="{ 'amount-due': row.paymentStatus !== 'paid' && !['draft','cancelled'].includes(row.status) }">{{ row.status === 'cancelled' ? 'Đơn đã hủy' : payNames[row.paymentStatus] }}</small><small v-if="!['draft','cancelled'].includes(row.status) && row.paymentStatus !== 'paid'">Còn {{ money(row.outstandingAmount) }}</small></td>
      <td><div class="person"><span class="initials small">{{ initials(creatorName(row)) }}</span><span>{{ creatorName(row) }}</span></div><small>Người phụ trách đơn</small></td><td><v-chip size="small" :color="statusColors[row.status]" variant="tonal">{{ names[row.status] }}</v-chip></td>
     </template><td><v-btn variant="text" color="primary" size="small" :append-icon="customersMode ? 'mdi-pencil-outline' : 'mdi-chevron-right'" :aria-label="customersMode ? `Sửa khách hàng ${row.name}` : `Xem đơn ${row.orderCode}`" @click="customersMode ? editCustomer(row) : openDetail(row.id)">{{ customersMode ? 'Chỉnh sửa' : 'Chi tiết' }}</v-btn></td></tr>
    </tbody></v-table></div>
    <Pagination v-model:page="page" v-model:page-size="pageSize" :total="total" :loading="loading" />
   </v-card>
   <p v-if="canView" class="footnote"><v-icon icon="mdi-information-outline" size="16" />{{ customersMode ? 'Thông tin khách hàng được quản lý riêng trong từng trại.' : 'Người lập đơn là người phụ trách. Đơn tự hoàn tất khi đã giao đủ giống và thu đủ tiền.' }}</p>

   <v-dialog v-model="customerEditor" max-width="600" :persistent="saving" scrollable><v-card class="operation-dialog">
    <div class="dialog-heading"><div><span class="eyebrow">DANH BẠ KHÁCH HÀNG</span><h2>{{ customerForm.id ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng' }}</h2></div><v-btn icon="mdi-close" variant="text" aria-label="Đóng thông tin khách hàng" :disabled="saving" @click="customerEditor = false" /></div>
    <v-card-text><v-form id="customer-form" @submit.prevent="saveCustomer"><v-text-field v-model="customerForm.name" label="Tên khách hàng *" maxlength="150" :disabled="saving" /><v-text-field v-model="customerForm.phone" label="Điện thoại" maxlength="30" :disabled="saving" /><v-textarea v-model="customerForm.address" label="Địa chỉ" maxlength="4000" rows="3" :disabled="saving" /><p class="muted">Chỉ tên khách hàng là bắt buộc. Thông tin liên hệ giúp lập đơn và giao giống thuận tiện hơn.</p><v-alert v-if="actionError" type="error" variant="tonal" class="mt-4">{{ actionError }}</v-alert></v-form></v-card-text>
    <v-card-actions class="dialog-actions"><v-btn :disabled="saving" @click="customerEditor = false">Đóng</v-btn><v-btn form="customer-form" type="submit" color="primary" variant="flat" :loading="saving">Lưu khách hàng</v-btn></v-card-actions>
   </v-card></v-dialog>

   <v-dialog v-model="editor" max-width="960" :persistent="saving" scrollable><v-card class="operation-dialog">
    <div class="dialog-heading"><div><span class="eyebrow">ĐƠN BÁN GIỐNG</span><h2>{{ form.id ? 'Chỉnh sửa đơn nháp' : 'Tạo đơn bán giống' }}</h2><p>Người lập đơn là người phụ trách đơn hàng.</p></div><v-btn icon="mdi-close" variant="text" aria-label="Đóng form đơn bán giống" :disabled="saving" @click="editor = false" /></div>
    <v-card-text><ol class="wizard-steps" aria-label="Các bước lập đơn"><li v-for="(title,index) in ['Khách hàng','Chọn giống','Kiểm tra']" :key="title" :class="{active: editorStep === index + 1, done: editorStep > index + 1}" :aria-current="editorStep === index + 1 ? 'step' : undefined"><span>{{ index + 1 }}</span>{{ title }}</li></ol>
     <v-alert v-if="optionError" type="error" variant="tonal" class="mb-4">{{ optionError }}<v-btn variant="text" @click="loadOptions">Thử lại</v-btn></v-alert>
     <v-form id="order-form" @submit.prevent="editorStep < 3 ? advanceEditor() : saveDraft()">
      <section v-if="editorStep === 1" aria-label="Thông tin khách hàng của đơn"><h3 class="form-section-title">Thông tin khách hàng &amp; giao giống</h3><v-text-field v-model="customerSearch" label="Tìm khách hàng theo tên / điện thoại" prepend-inner-icon="mdi-magnify" :disabled="saving" /><v-select v-model="form.customerId" label="Khách hàng *" :items="selectedCustomerOptions" item-title="name" item-value="id" :loading="optionsLoading" :disabled="saving" /><Pagination v-model:page="customerPage" :page-size="25" :sizes="[25]" :total="customerTotal" :loading="optionsLoading" /><div class="customer-preview" v-if="selectedCustomer"><v-icon icon="mdi-account-outline" /><div><strong>{{ selectedCustomer.name }}</strong><p>{{ selectedCustomer.phone || 'Chưa có số điện thoại' }} · {{ selectedCustomer.address || 'Chưa có địa chỉ' }}</p></div></div><v-text-field v-model="form.expectedDeliveryDate" type="date" label="Ngày dự kiến giao" :disabled="saving" class="mt-5" /><v-textarea v-model="form.notes" label="Ghi chú đơn hàng" rows="2" maxlength="4000" :disabled="saving" /></section>
      <section v-else-if="editorStep === 2" aria-label="Các lô giống trong đơn"><h3 class="form-section-title">Chọn lô giống &amp; số lượng</h3><v-text-field v-model="batchSearch" label="Tìm lô sẵn sàng bán theo mã" prepend-inner-icon="mdi-magnify" :disabled="saving" /><v-alert type="info" variant="tonal" density="compact" class="mb-5">Lượng khả dụng chưa trừ các đơn nháp. Máy chủ kiểm tra và giữ lượng khi xác nhận đơn.</v-alert><article v-for="(item,index) in form.items" :key="index" class="draft-item"><div class="draft-item-heading"><strong>Lô giống {{ index + 1 }}</strong><v-btn variant="text" color="error" size="small" :disabled="saving || form.items.length === 1" :aria-label="`Xóa dòng ${index + 1}`" @click="form.items.splice(index,1)">Xóa dòng</v-btn></div><v-select v-model="item.batchId" :label="`Lô giống ${index + 1} *`" :items="selectedBatchOptions" item-value="id" :item-title="b => `${b.batchCode} · ${b.tank?.name || ''}${b.availableQuantity != null ? ' · Khả dụng: ' + quantity(b.availableQuantity) : ''}`" :disabled="saving" /><div class="form-grid"><v-text-field v-model="item.quantity" label="Số lượng (con) *" inputmode="numeric" :disabled="saving" /><v-text-field v-model="item.unitPrice" label="Đơn giá VND *" inputmode="decimal" :disabled="saving" /></div><div class="line-total">Thành tiền <strong>{{ money(lineAmount(item)) }}</strong></div></article><Pagination v-model:page="batchPage" :page-size="25" :sizes="[25]" :total="batchTotal" :loading="optionsLoading" /><v-btn variant="outlined" prepend-icon="mdi-plus" :disabled="saving || form.items.length >= 100" @click="form.items.push({batchId:'',quantity:'',unitPrice:''})">Thêm lô giống</v-btn></section>
      <section v-else aria-label="Kiểm tra đơn trước khi lưu"><h3 class="form-section-title">Kiểm tra trước khi lưu</h3><dl class="review-grid"><div><dt>Khách hàng</dt><dd>{{ selectedCustomer?.name || '—' }}</dd></div><div><dt>Dự kiến giao</dt><dd>{{ form.expectedDeliveryDate || 'Chưa chọn ngày' }}</dd></div><div><dt>Điện thoại</dt><dd>{{ selectedCustomer?.phone || '—' }}</dd></div><div><dt>Ghi chú</dt><dd class="notes">{{ form.notes || 'Không có ghi chú' }}</dd></div></dl><div class="table-wrap"><v-table><thead><tr><th>Lô giống</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody><tr v-for="(item,index) in form.items" :key="index"><td>{{ batchName(item.batchId) }}</td><td>{{ quantity(item.quantity) }} con</td><td>{{ money(item.unitPrice) }}</td><td>{{ money(lineAmount(item)) }}</td></tr></tbody></v-table></div><div class="review-total"><span>Tổng giá trị đơn</span><strong>{{ money(draftTotal) }}</strong></div><v-alert type="info" variant="tonal" class="mt-5">Đơn được lưu ở trạng thái Nháp, chưa giữ lượng giống. Quản lý kiểm tra và xác nhận sau khi lưu.</v-alert></section>
      <v-alert v-if="actionError" type="error" variant="tonal" class="mt-4">{{ actionError }}</v-alert>
     </v-form>
    </v-card-text><v-card-actions class="dialog-actions"><v-btn :disabled="saving" @click="editorStep === 1 ? editor = false : (editorStep--, actionError = '')">{{ editorStep === 1 ? 'Hủy' : 'Quay lại' }}</v-btn><v-btn type="submit" form="order-form" color="primary" variant="flat" :loading="saving" :disabled="optionsLoading">{{ editorStep === 3 ? 'Lưu nháp' : 'Tiếp tục' }}<v-icon v-if="editorStep < 3" icon="mdi-arrow-right" end /></v-btn></v-card-actions>
   </v-card></v-dialog>

   <v-dialog v-model="detailOpen" max-width="1080" :persistent="saving" scrollable><v-card class="operation-dialog">
    <div class="dialog-heading"><div><span class="eyebrow">ĐƠN BÁN GIỐNG</span><h2>{{ detail?.orderCode || 'Chi tiết đơn bán giống' }}</h2><p v-if="detail">{{ creatorName(detail) }} phụ trách · {{ date(detail.createdAt) }}</p></div><v-btn icon="mdi-close" variant="text" aria-label="Đóng chi tiết đơn bán giống" :disabled="saving" @click="detailOpen = false" /></div><v-progress-linear v-if="detailLoading" indeterminate aria-label="Đang tải chi tiết" />
    <v-card-text><v-alert v-if="actionError" type="error" variant="tonal" class="mb-5">{{ actionError }}<p v-if="detail">Nếu giao / thu tiền bị lỗi kết nối, bấm lại để gửi đúng nội dung giao dịch trước đó; các sửa đổi chưa được gửi.</p><v-btn v-else variant="text" @click="detailOpen = false">Đóng và thử lại từ danh sách</v-btn></v-alert>
     <template v-if="detail"><div class="detail-badges"><v-chip :color="statusColors[detail.status]" size="small">{{ names[detail.status] }}</v-chip><v-chip :color="detail.paymentStatus === 'paid' ? 'success' : 'warning'" size="small" variant="tonal">{{ payNames[detail.paymentStatus] }}</v-chip></div><div class="detail-groups"><section aria-labelledby="sales-customer-heading"><h3 id="sales-customer-heading">Khách hàng &amp; giao nhận</h3><dl><div><dt>Khách hàng</dt><dd>{{ detail.customerName || detail.customer?.name || '—' }}</dd></div><div><dt>Điện thoại</dt><dd>{{ detail.customerPhone || detail.customer?.phone || '—' }}</dd></div><div><dt>Địa chỉ giao hàng</dt><dd>{{ detail.deliveryAddress || detail.customer?.address || '—' }}</dd></div></dl></section><section aria-labelledby="sales-order-heading"><h3 id="sales-order-heading">Thông tin đơn hàng</h3><dl><div><dt>Người phụ trách</dt><dd>{{ creatorName(detail) }}</dd></div><div><dt>Dự kiến giao</dt><dd>{{ detail.expectedDeliveryDate?.slice(0,10) || 'Chưa chọn ngày' }}</dd></div><div><dt>Ghi chú đơn hàng</dt><dd class="notes">{{ detail.notes || '—' }}</dd></div></dl></section></div><div class="financial-summary"><div><small>Giá trị đơn</small><strong>{{ money(detail.totalAmount) }}</strong></div><div><small>Đã thu</small><strong class="green">{{ money(detail.paidAmount) }}</strong></div><div><small>Còn phải thu</small><strong :class="{ 'amount-due': Number(detail.outstandingAmount) > 0 }">{{ money(detail.outstandingAmount) }}</strong></div></div>
      <v-tabs v-model="detailTab" color="primary" class="detail-tabs" aria-label="Nội dung chi tiết đơn" show-arrows><v-tab value="items">Giống trong đơn</v-tab><v-tab value="deliveries">Giao hàng ({{ detail.deliveries?.length || 0 }})</v-tab><v-tab value="payments">Thu tiền ({{ detail.payments?.length || 0 }})</v-tab><v-tab v-if="canCancel" value="cancel">Hủy đơn</v-tab></v-tabs>
      <section v-if="detailTab === 'items'" class="detail-tab-content"><div class="table-wrap"><v-table><thead><tr><th>Lô / bể</th><th>Đặt (con)</th><th>Đã giao</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody><tr v-for="item in detail.items" :key="item.id"><td><strong>{{ item.batch?.batchCode }}</strong><small>{{ item.batch?.tank?.name }}</small></td><td>{{ quantity(item.quantity) }}</td><td>{{ quantity(item.deliveredQuantity) }}</td><td>{{ money(item.unitPrice) }}</td><td>{{ money(item.lineTotal) }}</td></tr></tbody></v-table></div><p class="muted mt-4">{{ detail.status === 'draft' ? 'Đơn nháp chưa giữ lượng giống. Xác nhận đơn để kiểm tra và giữ lượng.' : 'Ghi nhận giao thực tế theo từng đợt. Đơn tự hoàn tất khi giao đủ và thu đủ tiền.' }}</p><div class="actions mt-5"><v-btn v-if="detail.status === 'draft' && canView" variant="outlined" :disabled="saving" @click="editDraft">Sửa nháp</v-btn><v-btn v-if="detail.status === 'draft' && wholeFarm" color="primary" :loading="saving" @click="changeStatus('confirm')">Xác nhận và giữ lượng</v-btn></div></section>
      <section v-else-if="detailTab === 'deliveries'" class="detail-tab-content"><div class="delivery-summary"><span>{{ deliveryName(detail) }}</span><strong>{{ quantity(deliveredQuantity(detail)) }} / {{ quantity(orderedQuantity(detail)) }} con</strong></div><v-progress-linear :model-value="deliveryPercent(detail)" color="primary" rounded height="5" class="mb-5" aria-label="Tiến độ giao đơn" /><v-form v-if="canDeliver" class="transaction" @submit.prevent="transact('deliveries')"><h3>Ghi nhận giao giống</h3><p class="muted mb-4">Nhập số con thực giao của từng lô trong đợt này.</p><template v-for="item in detail.items" :key="item.id"><v-text-field v-if="item.quantity > item.deliveredQuantity" v-model="deliveryRows[item.id]" :label="`${item.batch?.batchCode || 'Lô'} · Còn ${item.quantity - item.deliveredQuantity} con`" inputmode="numeric" :disabled="saving" /></template><v-textarea v-model="deliveryNotes" label="Ghi chú giao hàng" rows="2" maxlength="4000" :disabled="saving" /><v-btn color="primary" type="submit" :loading="saving">Ghi nhận giao hàng</v-btn></v-form><h3 class="history-heading">Lịch sử giao hàng</h3><p v-if="!detail.deliveries?.length" class="muted">Chưa có lần giao.</p><article v-for="delivery in detail.deliveries" :key="delivery.id" class="history"><div class="history-icon"><v-icon icon="mdi-truck-delivery-outline" size="20" /></div><div><strong>{{ date(delivery.createdAt) }}</strong><small>{{ delivery.creator?.displayName || delivery.creator?.email || delivery.createdBy }}</small><p v-for="item in delivery.items" :key="item.id">{{ detail.items.find(i => i.id === item.orderItemId)?.batch?.batchCode || item.orderItemId }}: {{ quantity(item.quantity) }} con</p><p class="notes">{{ delivery.notes }}</p></div></article></section>
      <section v-else-if="detailTab === 'payments'" class="detail-tab-content"><v-form v-if="canPay" class="transaction" @submit.prevent="transact('payments')"><h3>Ghi nhận thu tiền</h3><div class="form-grid mt-5"><v-text-field v-model="payment.amount" label="Số tiền VND *" inputmode="decimal" :disabled="saving" /><v-select v-model="payment.method" label="Hình thức" :items="[{title:'Tiền mặt',value:'cash'},{title:'Chuyển khoản',value:'bank_transfer'}]" :disabled="saving" /></div><v-textarea v-model="paymentNotes" label="Ghi chú thu tiền" rows="2" maxlength="4000" :disabled="saving" /><v-btn color="primary" type="submit" :loading="saving">Ghi nhận thu tiền</v-btn></v-form><p v-else-if="!wholeFarm" class="muted">Chỉ chủ trại hoặc quản lý trại được ghi nhận khoản thu.</p><h3 class="history-heading">Lịch sử thu tiền</h3><p v-if="!detail.payments?.length" class="muted">Chưa có khoản thu.</p><article v-for="receipt in detail.payments" :key="receipt.id" class="history"><div class="history-icon"><v-icon icon="mdi-cash-check" size="20" /></div><div><strong class="green">{{ money(receipt.amount) }} · {{ receipt.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản' }}</strong><small>{{ date(receipt.createdAt) }} · {{ receipt.creator?.displayName || receipt.creator?.email || receipt.createdBy }}</small><p class="notes">{{ receipt.notes }}</p></div></article></section>
      <section v-else-if="detailTab === 'cancel' && canCancel" class="detail-tab-content"><v-alert type="warning" variant="tonal" class="mb-5">Chỉ hủy đơn chưa giao giống và chưa thu tiền. Hủy đơn sẽ giải phóng lượng giống đã giữ.</v-alert><v-textarea v-model="reason" label="Lý do hủy *" maxlength="4000" rows="3" :disabled="saving" /><v-btn color="error" variant="outlined" :disabled="saving" @click="changeStatus('cancel')">Hủy đơn bán giống</v-btn></section>
     </template>
    </v-card-text><v-card-actions class="dialog-actions"><v-btn :disabled="saving" @click="detailOpen = false">Đóng</v-btn></v-card-actions>
   </v-card></v-dialog>
  </section>
 </AppShell>
</template>
<style scoped>
.page-overview{border:1px solid #dfe8e2;border-radius:12px;background:white;overflow:hidden}.overview-caption{padding:12px 22px;border-bottom:1px solid #e5ece3;color:#6d8373;font-size:9px;letter-spacing:1px;font-weight:700}.overview-caption span{float:right;letter-spacing:0;font-weight:400;font-size:10px}.overview-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.overview-grid>div{padding:20px 24px}.overview-grid>div+div{border-left:1px solid #e5ece3}.overview-grid small,.overview-grid span{display:block;font-size:11px;line-height:1.7;color:#74897a}.overview-grid strong{display:block;font-size:28px;line-height:1.3;margin:8px 0;color:#183f35}.overview-grid span{font-size:10px}.overview-highlight{background:#edf5ee}.sales-page{display:grid;gap:24px;color:#193e35;min-width:0}.page-heading{display:flex;align-items:center;justify-content:space-between;gap:24px}.eyebrow{display:block;font-size:10px;line-height:1.5;font-weight:750;letter-spacing:1.8px;color:#087f6e;margin-bottom:8px}h1{font-size:30px;font-weight:700;letter-spacing:-.7px;line-height:1.25}h2{font-size:20px;line-height:1.4}h3{font-size:16px}.page-heading p{font-size:13px;line-height:1.7;color:#6a7e74;margin:10px 0 0}.list-card{border:1px solid #dfe8e2;border-radius:12px!important;overflow:hidden}.panel-heading{display:flex;justify-content:space-between;align-items:center;padding:18px 22px 4px;gap:16px}.panel-heading h2{font-size:15px;font-weight:700;display:flex;align-items:center;gap:10px}.count{font-size:11px;padding:2px 7px;border-radius:5px;background:#edf3ef;color:#688075}.status-tabs{padding:0 20px;border-bottom:1px solid #e4ece6}.status-tabs :deep(.v-tab){font-size:12px;text-transform:none;letter-spacing:0;min-width:0;padding:0 14px}.list-toolbar{padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid #e4ece6;background:#fff}.list-toolbar>.v-input{max-width:440px}.list-toolbar :deep(.v-field){font-size:13px;background:#f7f9f6}.toolbar-caption{font-size:11px;color:#788b80}.table-wrap{overflow-x:auto;max-width:100%}.sales-table{font-size:12px!important}.sales-table :deep(th){background:#f7f9f6!important;color:#7b8e83!important;font-size:10px!important;font-weight:750!important;letter-spacing:.4px;height:42px!important;white-space:nowrap}.sales-table :deep(td){padding:20px!important;vertical-align:middle!important;border-bottom-color:#edf1ec!important;white-space:nowrap}.sales-table :deep(tr:last-child td){border-bottom:0!important}.sales-table :deep(tbody tr:hover){background:#f8fbf8}.sales-table :deep(.v-chip){font-size:10px;font-weight:650;height:23px}.sales-table strong{font-size:12px;line-height:1.5}.sales-table small,.operation-dialog td small{display:block;color:#72887c;font-size:10px;line-height:1.7;margin-top:5px}.sales-table .customer-name{font-size:11px;color:#486457}.sales-table .address{max-width:350px;min-width:180px;white-space:normal!important;overflow-wrap:anywhere;line-height:1.8}.order-code,.green{color:#087f6e}.person{display:flex;align-items:center;gap:10px;max-width:220px;white-space:normal;overflow-wrap:anywhere}.initials{width:36px;height:36px;border-radius:11px;background:#edf3e9;color:#53775c;font-size:12px;font-weight:700;display:grid;place-items:center;flex-shrink:0}.initials.small{width:28px;height:28px;border-radius:50%;font-size:9px}.delivery-progress{max-width:110px;margin-top:9px}.amount-due{color:#a66616!important}.empty{padding:48px 24px;text-align:center;color:#75867c}.empty .v-icon{color:#8ea89a;margin-bottom:15px}.empty h3{color:#365b4c;margin-bottom:10px;font-size:15px}.empty p,.footnote{font-size:12px;color:#7b8d82;line-height:1.7}.footnote{display:flex;gap:8px;align-items:flex-start;margin:0}.operation-dialog{border-radius:15px!important;color:#193e35}.dialog-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:24px 28px;border-bottom:1px solid #e0e9e2;flex-shrink:0}.dialog-heading .eyebrow{margin-bottom:5px}.dialog-heading p{font-size:12px;color:#71877b;margin:8px 0 0}.dialog-heading>.v-btn{margin:-6px -12px 0 0;flex-shrink:0}.operation-dialog :deep(.v-card-text){padding:26px 28px!important;min-height:0}.operation-dialog :deep(.v-field){font-size:13px}.operation-dialog :deep(.v-label){font-size:13px}.dialog-actions{padding:16px 28px!important;border-top:1px solid #e0e9e2;justify-content:flex-end;gap:10px;flex-shrink:0;background:#fff}.wizard-steps{list-style:none;display:flex;gap:20px;margin:0 0 30px;padding:0}.wizard-steps li{display:flex;align-items:center;gap:9px;font-size:12px;color:#8a9a90;flex:1}.wizard-steps li:not(:last-child):after{content:'';height:1px;flex:1;background:#e0e9db;margin-left:8px}.wizard-steps li span{width:28px;height:28px;display:grid;place-items:center;background:#f0f4ed;border:1px solid #dfe7d8;border-radius:50%;font-size:11px;flex-shrink:0}.wizard-steps li.active{color:#087f6e;font-weight:700}.wizard-steps li.active span,.wizard-steps li.done span{background:#087f6e;border-color:#087f6e;color:#fff}.form-section-title{font-size:17px;margin-bottom:24px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.customer-preview{display:flex;gap:12px;padding:16px;border-radius:8px;background:#f3f7ef;color:#42654f;margin-top:10px}.customer-preview p{font-size:12px;line-height:1.7;margin-top:5px;color:#6d8373}.draft-item{border:1px solid #dfe8df;border-radius:10px;padding:18px;margin-bottom:18px}.draft-item-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;font-size:13px}.line-total{border-top:1px solid #e5ece1;padding-top:12px;display:flex;justify-content:space-between;font-size:12px;color:#6c8271}.line-total strong{color:#193e35}.review-grid,.detail-groups dl{display:grid;gap:20px}.review-grid{grid-template-columns:1fr 1fr;margin:0 0 26px}.review-grid dt,.detail-groups dt{font-size:11px;color:#7b8b7e}.review-grid dd,.detail-groups dd{font-size:13px;font-weight:550;line-height:1.8;margin:5px 0 0;overflow-wrap:anywhere}.review-total{margin-top:20px;padding:20px;background:#f2f6ec;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:15px;font-size:14px}.review-total strong{font-size:21px}.detail-badges{display:flex;gap:8px;flex-wrap:wrap}.detail-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:24px}.detail-groups section{padding:20px;border:1px solid #dfe8df;border-radius:10px}.detail-groups h3{font-size:14px;margin-bottom:20px}.financial-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;background:#f3f7ee;border:1px solid #e0e8d9;border-radius:10px;margin:24px 0}.financial-summary>div{padding:20px;overflow-wrap:anywhere}.financial-summary small{font-size:11px;color:#6e8371;display:block}.financial-summary strong{font-size:18px;display:block;margin-top:9px}.detail-tabs{border-bottom:1px solid #dfe8df}.detail-tabs :deep(.v-tab){font-size:12px;text-transform:none;letter-spacing:0}.detail-tab-content{padding-top:24px}.detail-tab-content :deep(th){background:#f7f9f4!important;color:#74877a!important;font-size:11px!important;white-space:nowrap}.detail-tab-content :deep(td){font-size:12px!important;white-space:nowrap}.muted{font-size:12px;color:#708575;line-height:1.8}.transaction{padding:22px;border:1px solid #dfe8df;border-radius:10px;background:#fafcf8;margin-bottom:26px}.transaction h3{font-size:15px;margin-bottom:12px}.history-heading{font-size:15px;margin:26px 0 16px}.history{display:flex;gap:14px;border:1px solid #e3ebe1;border-radius:9px;padding:18px;margin-top:12px;font-size:12px;line-height:1.8}.history small{display:block;color:#7a8e7e;margin-top:5px;font-size:11px}.history p{margin:6px 0 0}.history-icon{color:#087f6e;background:#eef5eb;display:grid;place-items:center;width:36px;height:36px;border-radius:8px;flex-shrink:0}.delivery-summary{display:flex;justify-content:space-between;gap:20px;line-height:1.8;font-size:13px;margin-bottom:12px}.actions{display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap}.notes{white-space:pre-wrap;overflow-wrap:anywhere}.sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:900px){.toolbar-caption{display:none}.financial-summary strong{font-size:15px}.financial-summary>div{padding:16px}.sales-table :deep(td){padding:16px!important}}
@media(max-width:600px){.overview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.overview-grid>div{padding:18px}.overview-grid>div:nth-child(3){border-left:0}.overview-grid>div:nth-child(n+3){border-top:1px solid #e5ece3}.overview-caption{padding:12px 16px}.overview-caption span{float:none;display:block;margin-top:4px}.sales-page{gap:20px}.page-heading{align-items:flex-start;flex-direction:column;gap:18px}h1{font-size:26px}.page-heading p{font-size:12px}.page-heading>.v-btn{align-self:flex-end}.panel-heading{padding:16px 16px 4px}.list-toolbar{padding:16px}.list-toolbar>.v-input{max-width:100%}.status-tabs{padding:0 6px}.dialog-heading{padding:20px!important}.operation-dialog :deep(.v-card-text){padding:20px!important}.dialog-actions{padding:14px 20px!important}.dialog-heading h2{font-size:18px}.form-grid,.detail-groups,.review-grid{grid-template-columns:1fr}.wizard-steps{gap:10px}.wizard-steps li{gap:6px;font-size:10px}.wizard-steps li:not(:last-child):after{margin-left:0}.wizard-steps li span{width:24px;height:24px;font-size:10px}.financial-summary{grid-template-columns:1fr;gap:0}.financial-summary>div{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:14px 16px}.financial-summary>div+div{border-top:1px solid #e0e8d9}.financial-summary strong{margin:0;font-size:15px}.review-total{align-items:flex-start;flex-direction:column}.draft-item{padding:14px}.transaction{padding:16px}.detail-groups{gap:16px}.detail-groups section{padding:16px}.sales-table .address{max-width:250px}}
</style>
