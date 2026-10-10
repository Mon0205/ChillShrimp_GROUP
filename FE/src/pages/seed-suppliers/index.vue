<script setup>
import AppShell from '../../components/shell/index.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'

const farmContext = useFarmContext()
const farms = ref([])
const suppliers = ref([])
const loading = ref(true)
const listLoading = ref(false)
const saving = ref(false)
const historyLoading = ref(false)
const detailLoading = ref(false)
const error = ref('')
const query = ref('')
const page = ref(1)
const limit = 10
const pagination = ref({ total: 0, pageCount: 0 })
const supplierDialog = ref(false)
const detailDialog = ref(false)
const historyDialog = ref(false)
const editingSupplier = ref(null)
const selectedSupplier = ref(null)
const supplierFormRef = ref(null)
const form = ref({ name: '', licenseNo: '', phone: '', address: '', broodstockInformation: '', notes: '' })
const historyItems = ref([])
const historyPage = ref(1)
const historyPagination = ref({ total: 0, pageCount: 0 })

const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const selectedRole = computed(() => selectedFarm.value?.role || '')
const canView = computed(() => ['owner', 'area_manager'].includes(selectedRole.value))
const canManage = computed(() => selectedRole.value === 'owner')
const pageCount = computed(() => Math.max(1, pagination.value.pageCount || 1))
const historyPageCount = computed(() => Math.max(1, historyPagination.value.pageCount || 1))

const requiredRule = (label) => (value) => String(value ?? '').trim().length > 0 || `${label} là bắt buộc.`
const nameRules = [requiredRule('Tên nhà cung cấp'), (value) => String(value ?? '').trim().length <= 150 || 'Tên không được vượt quá 150 ký tự.']
const licenseRules = [(value) => String(value ?? '').length <= 80 || 'Số giấy phép không được vượt quá 80 ký tự.']
const phoneRules = [
  (value) => !String(value ?? '').trim() || String(value).trim().length <= 20 || 'Số điện thoại không được vượt quá 20 ký tự.',
  (value) => !String(value ?? '').trim() || /^[+()\d.\-\s]+$/.test(String(value).trim()) || 'Số điện thoại chứa ký tự không hợp lệ.',
]
const textRules = (label) => [(value) => String(value ?? '').length <= 4000 || `${label} không được vượt quá 4.000 ký tự.`]

async function loadFarms() {
  const result = await api('/farms')
  farms.value = result.data
  farmContext.farms = result.data
  farmContext.ready = true
  if (!farms.value.some((farm) => farm.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
}

function supplierUrl(supplierId = '') {
  const base = `/farms/${encodeURIComponent(farmId.value)}/seed-suppliers`
  return supplierId ? `${base}/${encodeURIComponent(supplierId)}` : base
}

async function loadSuppliers() {
  suppliers.value = []
  pagination.value = { total: 0, pageCount: 0 }
  if (!farmId.value || !canView.value) return
  listLoading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(limit) })
    const searchTerm = String(query.value || '').trim()
    if (searchTerm) params.set('q', searchTerm)
    const result = await api(`${supplierUrl()}?${params}`)
    suppliers.value = result.data.items
    pagination.value = result.data.pagination
  } catch (err) {
    error.value = err.message
  } finally {
    listLoading.value = false
  }
}

async function loadPage() {
  loading.value = true
  error.value = ''
  try {
    await loadFarms()
    await loadSuppliers()
  } catch (err) {
    error.value = err.message
    showToast(err.message, 'error')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = { name: '', licenseNo: '', phone: '', address: '', broodstockInformation: '', notes: '' }
}

function openCreate() {
  editingSupplier.value = null
  resetForm()
  supplierDialog.value = true
}

function openEdit(supplier) {
  editingSupplier.value = supplier
  form.value = {
    name: supplier.name || '',
    licenseNo: supplier.licenseNo || '',
    phone: supplier.phone || '',
    address: supplier.address || '',
    broodstockInformation: supplier.broodstockInformation || '',
    notes: supplier.notes || '',
  }
  supplierDialog.value = true
}

async function saveSupplier() {
  const validation = await supplierFormRef.value?.validate()
  if (!validation?.valid) return
  saving.value = true
  const payload = Object.fromEntries(Object.entries(form.value).map(([key, value]) => [key, value.trim() || null]))
  try {
    const editing = Boolean(editingSupplier.value)
    await api(supplierUrl(editing ? editingSupplier.value.id : ''), {
      method: editing ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    })
    supplierDialog.value = false
    showToast(editing ? 'Đã cập nhật nhà cung cấp.' : 'Đã thêm nhà cung cấp.', 'success')
    if (!editing) page.value = 1
    await loadSuppliers()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    saving.value = false
  }
}

async function openDetails(supplier) {
  selectedSupplier.value = supplier
  detailDialog.value = true
  detailLoading.value = true
  try {
    selectedSupplier.value = (await api(supplierUrl(supplier.id))).data
  } catch (err) {
    detailDialog.value = false
    showToast(err.message, 'error')
  } finally {
    detailLoading.value = false
  }
}

async function loadHistory() {
  if (!selectedSupplier.value || !farmId.value) return
  historyLoading.value = true
  try {
    const params = new URLSearchParams({ page: String(historyPage.value), limit: '8' })
    const result = await api(`${supplierUrl(selectedSupplier.value.id)}/seed-batches?${params}`)
    historyItems.value = result.data.items
    historyPagination.value = result.data.pagination
  } catch (err) {
    historyItems.value = []
    showToast(err.message, 'error')
  } finally {
    historyLoading.value = false
  }
}

async function openHistory(supplier) {
  selectedSupplier.value = supplier
  historyItems.value = []
  historyPage.value = 1
  historyDialog.value = true
  await loadHistory()
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

const batchStatus = {
  active: 'Đang ương',
  ready_for_sale: 'Sẵn sàng bán',
  sold: 'Đã bán',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
}

watch(farmId, async () => {
  page.value = 1
  await loadSuppliers()
})
watch(query, () => {
  page.value = 1
  loadSuppliers()
})
watch(page, loadSuppliers)
watch(historyPage, loadHistory)
onMounted(loadPage)
</script>

<template>
<AppShell>
    <header class="page-header">
      <div>
        <span class="eyebrow">ĐẦU VÀO SẢN XUẤT</span>
        <h1>Nhà cung cấp giống</h1>
        <p>Quản lý thông tin cơ sở cung cấp và tra cứu các lô giống đã tiếp nhận.</p>
      </div>
      <div class="page-actions">
        <v-btn v-if="canManage && farmId" color="primary" prepend-icon="mdi-plus" @click="openCreate">Thêm nhà cung cấp</v-btn>
      </div>
    </header>

    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />
    <template v-else-if="!farms.length">
      <v-card class="empty-card" elevation="0">
        <div class="empty-icon">!</div><h2>Chưa có trang trại</h2>
        <p>Tạo hoặc tham gia trang trại trước khi quản lý nhà cung cấp giống.</p>
        <v-btn to="/farms" color="primary" variant="outlined">Mở quản lý trang trại</v-btn>
      </v-card>
    </template>
    <template v-else-if="!canView">
      <div class="permission-empty">Vai trò hiện tại không có quyền xem danh sách nhà cung cấp giống.</div>
    </template>
    <template v-else>
      <section class="toolbar" aria-label="Bộ lọc nhà cung cấp">
        <div class="farm-control"><label for="supplier-farm">Trang trại</label><v-select id="supplier-farm" v-model="farmId" :items="farms" item-title="name" item-value="id" density="compact" variant="outlined" hide-details /></div>
        <div class="search-control"><label for="supplier-search">Tìm nhà cung cấp</label><v-text-field id="supplier-search" v-model="query" placeholder="Tên, số giấy phép hoặc điện thoại" prepend-inner-icon="mdi-magnify" clearable density="compact" variant="outlined" hide-details /></div>
        <div class="result-count"><strong>{{ pagination.total }}</strong><span>nhà cung cấp</span></div>
      </section>

      <v-card class="list-card" elevation="0">
        <div class="list-heading"><div><span class="eyebrow">DANH BẠ GIỐNG</span><h2>{{ selectedFarm?.name || 'Trang trại đang chọn' }}</h2><p>Nhà cung cấp được lưu riêng trong phạm vi trang trại.</p></div><span class="count-badge">{{ pagination.total }}</span></div>
        <v-progress-linear v-if="listLoading" class="list-progress" indeterminate color="primary" rounded />
        <div v-else-if="error" class="notice error-notice" role="alert"><span>{{ error }}</span><v-btn size="small" variant="text" color="error" @click="loadSuppliers">Thử lại</v-btn></div>
        <div v-else-if="!suppliers.length" class="empty-state">
          <div>{{ query ? '⌕' : '+' }}</div><strong>{{ query ? 'Không tìm thấy nhà cung cấp' : 'Chưa có nhà cung cấp giống' }}</strong>
          <p>{{ query ? 'Thử từ khóa khác.' : 'Thêm cơ sở cung cấp để dùng khi tiếp nhận lô giống.' }}</p>
          <v-btn v-if="canManage && !query" color="primary" variant="outlined" size="small" @click="openCreate">Thêm nhà cung cấp</v-btn>
        </div>
        <div v-else class="table-wrap">
          <table class="app-data-table">
            <thead><tr><th>Nhà cung cấp</th><th>Giấy phép</th><th>Điện thoại</th><th>Địa chỉ</th><th>Cập nhật</th><th class="actions-heading">Thao tác</th></tr></thead>
            <tbody>
              <tr v-for="supplier in suppliers" :key="supplier.id">
                <td><div class="supplier-identity"><span>{{ supplier.name.slice(0, 1).toUpperCase() }}</span><div><strong>{{ supplier.name }}</strong><small>{{ supplier.broodstockInformation || 'Chưa có thông tin tôm bố mẹ' }}</small></div></div></td>
                <td>{{ supplier.licenseNo || '—' }}</td><td>{{ supplier.phone || '—' }}</td><td class="address-cell">{{ supplier.address || '—' }}</td><td>{{ formatDate(supplier.updatedAt) }}</td>
                <td><div class="row-actions">
                  <button class="icon-btn" type="button" title="Xem chi tiết" aria-label="Xem chi tiết nhà cung cấp" @click="openDetails(supplier)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/></svg></button>
                  <button class="icon-btn" type="button" title="Lịch sử lô giống" aria-label="Xem lịch sử lô giống" @click="openHistory(supplier)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v15H4zM8 3v4m8-4v4M4 10h16M8 14h3m-3 3h8"/></svg></button>
                  <button v-if="canManage" class="icon-btn" type="button" title="Cập nhật" aria-label="Cập nhật nhà cung cấp" @click="openEdit(supplier)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>
                </div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!listLoading && pagination.pageCount > 1" class="pagination-row"><span>{{ pagination.total }} kết quả · Trang {{ page }}/{{ pageCount }}</span><v-pagination v-model="page" :length="pageCount" :total-visible="5" density="compact" rounded="lg" /></div>
      </v-card>
    </template>

    <v-dialog v-model="supplierDialog" max-width="640">
      <v-card class="dialog-card">
        <span class="eyebrow">{{ editingSupplier ? 'CẬP NHẬT DANH BẠ' : 'DANH BẠ GIỐNG' }}</span><h2>{{ editingSupplier ? 'Thông tin nhà cung cấp' : 'Thêm nhà cung cấp' }}</h2>
        <v-form ref="supplierFormRef" class="dialog-form" validate-on="blur" @submit.prevent="saveSupplier">
          <label for="supplier-name">Tên cơ sở <span class="required-mark">*</span></label>
          <v-text-field id="supplier-name" v-model="form.name" maxlength="150" counter="150" :rules="nameRules" placeholder="Tên trại sản xuất hoặc đơn vị cung cấp" hide-details="auto" />
          <div class="field-grid"><div><label for="supplier-license">Số giấy phép/chứng nhận</label><v-text-field id="supplier-license" v-model="form.licenseNo" maxlength="80" :rules="licenseRules" placeholder="Không bắt buộc" hide-details="auto" /></div><div><label for="supplier-phone">Điện thoại</label><v-text-field id="supplier-phone" v-model="form.phone" maxlength="20" :rules="phoneRules" placeholder="Không bắt buộc" hide-details="auto" /></div></div>
          <label for="supplier-address">Địa chỉ</label><v-textarea id="supplier-address" v-model="form.address" maxlength="4000" :rules="textRules('Địa chỉ')" rows="2" auto-grow placeholder="Địa chỉ cơ sở" hide-details="auto" />
          <label for="supplier-broodstock">Thông tin tôm bố mẹ</label><v-textarea id="supplier-broodstock" v-model="form.broodstockInformation" maxlength="4000" :rules="textRules('Thông tin tôm bố mẹ')" rows="2" auto-grow placeholder="Dòng giống, SPF/SPR nếu có" hide-details="auto" />
          <label for="supplier-notes">Ghi chú</label><v-textarea id="supplier-notes" v-model="form.notes" maxlength="4000" :rules="textRules('Ghi chú')" rows="2" auto-grow hide-details="auto" />
          <div class="dialog-actions"><v-btn variant="text" @click="supplierDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="saving">{{ editingSupplier ? 'Lưu thay đổi' : 'Thêm nhà cung cấp' }}</v-btn></div>
        </v-form>
      </v-card>
    </v-dialog>
<v-dialog v-model="detailDialog" max-width="600">
      <v-card class="dialog-card"><span class="eyebrow">CHI TIẾT NHÀ CUNG CẤP</span>
        <v-progress-linear v-if="detailLoading" indeterminate color="primary" rounded />
        <template v-else-if="selectedSupplier">
          <h2>{{ selectedSupplier.name }}</h2>
          <dl class="detail-grid">
            <div><dt>Giấy phép/chứng nhận</dt><dd>{{ selectedSupplier.licenseNo || 'Chưa cung cấp' }}</dd></div><div><dt>Điện thoại</dt><dd>{{ selectedSupplier.phone || 'Chưa cung cấp' }}</dd></div>
            <div><dt>Địa chỉ</dt><dd>{{ selectedSupplier.address || 'Chưa cung cấp' }}</dd></div><div><dt>Thông tin tôm bố mẹ</dt><dd>{{ selectedSupplier.broodstockInformation || 'Chưa cung cấp' }}</dd></div>
            <div class="detail-wide"><dt>Ghi chú</dt><dd>{{ selectedSupplier.notes || 'Không có ghi chú' }}</dd></div><div><dt>Ngày tạo</dt><dd>{{ formatDate(selectedSupplier.createdAt) }}</dd></div><div><dt>Cập nhật gần nhất</dt><dd>{{ formatDate(selectedSupplier.updatedAt) }}</dd></div>
          </dl>
        </template>
        <div class="dialog-actions"><v-btn variant="text" @click="detailDialog = false">Đóng</v-btn><v-btn v-if="selectedSupplier" variant="outlined" color="primary" @click="detailDialog = false; openHistory(selectedSupplier)">Lịch sử lô giống</v-btn></div>
      </v-card>
    </v-dialog>
<v-dialog v-model="historyDialog" max-width="900">
      <v-card class="dialog-card history-card"><span class="eyebrow">TRUY XUẤT ĐẦU VÀO</span><h2>Lịch sử lô · {{ selectedSupplier?.name }}</h2>
        <v-progress-linear v-if="historyLoading" indeterminate color="primary" rounded />
        <div v-else-if="!historyItems.length" class="empty-state history-empty"><div>0</div><strong>Chưa có lô giống từ nhà cung cấp này</strong><p>Lịch sử xuất hiện sau khi lô được ghi nhận trong hệ thống.</p></div>
        <div v-else class="table-wrap history-table-wrap"><table class="app-data-table">
          <thead><tr><th>Mã lô</th><th>Mã nhà cung cấp</th><th>Loài / giai đoạn</th><th>Ao/bể</th><th>Số lượng đầu</th><th>Trạng thái</th><th>Tiếp nhận</th></tr></thead>
          <tbody><tr v-for="batch in historyItems" :key="batch.id"><td><strong>{{ batch.batchCode }}</strong></td><td>{{ batch.supplierLotCode || '—' }}</td><td>{{ batch.species }} · {{ batch.developmentStage }}</td><td>{{ batch.tank?.code }} · {{ batch.tank?.name }}</td><td>{{ Number(batch.initialQuantity || 0).toLocaleString('vi-VN') }}</td><td><span class="batch-status" :class="`batch-status--${batch.status}`">{{ batchStatus[batch.status] || batch.status }}</span></td><td>{{ formatDate(batch.receivedAt || batch.stockedDate) }}</td></tr></tbody>
        </table></div>
        <div class="dialog-actions history-actions"><v-pagination v-if="historyPagination.pageCount > 1" v-model="historyPage" :length="historyPageCount" :total-visible="5" density="compact" rounded="lg" /><v-btn variant="text" @click="historyDialog = false">Đóng</v-btn></div>
      </v-card>
    </v-dialog>

  </AppShell>
</template>

<style scoped>
*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px}.page-header p,.list-heading p{margin:0;color:#70817e;font-size:13px}.toolbar{display:grid;grid-template-columns:minmax(220px,.9fr) minmax(260px,1.6fr) auto;align-items:end;gap:14px;padding:16px 20px;margin-bottom:18px;border:1px solid #dce7e4;border-radius:12px;background:#fff}.toolbar label,.dialog-form label{display:block;margin-bottom:6px;color:#48625e;font-size:11px;font-weight:700}.result-count{display:grid;min-width:100px;padding:0 8px 5px;text-align:right}.result-count strong{color:#087f6e;font-size:18px}.result-count span{color:#70817e;font-size:10px}.list-card{padding:24px;border:1px solid #dce7e4!important;border-radius:12px!important}.list-heading{display:flex;justify-content:space-between;gap:18px;padding-bottom:18px;border-bottom:1px solid #e5ecea}.count-badge{min-width:34px;height:30px;display:grid;place-items:center;border-radius:8px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.list-progress{margin-top:12px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 10px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}td{padding:13px 10px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px}tbody tr:last-child td{border-bottom:0}.supplier-identity{min-width:205px;display:flex;align-items:center;gap:10px}.supplier-identity>span{width:36px;height:36px;flex:0 0 auto;display:grid;place-items:center;border-radius:9px;color:#087f6e;background:#e7f4f1;font-size:12px;font-weight:800}.supplier-identity strong,.supplier-identity small{display:block;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.supplier-identity strong{color:#294c47;font-size:11px}.supplier-identity small{margin-top:3px;color:#83918e;font-size:9px}.address-cell{max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.actions-heading{text-align:right}.row-actions{display:flex;justify-content:flex-end;gap:5px}.icon-btn{width:32px;height:32px;display:grid;place-items:center;border:0;border-radius:8px;color:#087f6e;background:#e7f4f1;cursor:pointer}.icon-btn:hover{background:#d6eee8}.icon-btn svg{width:17px;height:17px}.pagination-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:14px;border-top:1px solid #e8eeec;color:#70817e;font-size:10px}.empty-state,.empty-card{color:#70817e;text-align:center}.empty-state{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center}.empty-state>div,.empty-icon{width:42px;height:42px;display:grid;place-items:center;margin-bottom:12px;border-radius:12px;color:#087f6e;background:#e7f4f1;font-weight:800}.empty-state strong,.empty-card h2{color:#365751;font-size:12px}.empty-state p,.empty-card p{margin:5px 0 14px;font-size:11px}.empty-card{padding:42px;border:1px solid #dce7e4!important;border-radius:12px!important;background:#fff!important}.empty-card .empty-icon{margin:0 auto 14px}.permission-empty,.notice{padding:18px;border:1px dashed #b9d6d0;border-radius:12px;color:#647975;background:#f8fcfb;font-size:12px}.notice{display:flex;align-items:center;justify-content:space-between;border-style:solid}.error-notice{border-color:#f2cbc8;color:#9b3e3e;background:#fff4f3}.dialog-card{padding:26px;border-radius:12px!important}.dialog-form{display:grid;gap:8px;margin-top:18px}.required-mark{color:#b42318}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 20px;margin:18px 0 0}.detail-grid>div{padding:12px 0;border-bottom:1px solid #edf1f0}.detail-grid dt{margin-bottom:5px;color:#82908d;font-size:9px;font-weight:800;text-transform:uppercase}.detail-grid dd{margin:0;color:#294c47;font-size:12px;line-height:1.55;overflow-wrap:anywhere}.detail-wide{grid-column:1/-1}.history-table-wrap td{white-space:nowrap}.history-empty{min-height:190px}.history-actions{align-items:center}.history-actions .v-pagination{margin-right:auto}.batch-status{display:inline-block;padding:4px 7px;border-radius:6px;color:#087f6e;background:#e7f4f1;font-size:9px;font-weight:700}.batch-status--ready_for_sale{color:#9a6519;background:#fff1d9}.batch-status--sold{color:#1e6d9b;background:#e7f2fb}.batch-status--failed,.batch-status--cancelled{color:#a33c3c;background:#ffebea}
@media(max-width:760px){.page-header{align-items:stretch;flex-direction:column}.toolbar{grid-template-columns:1fr 1fr}.result-count{text-align:left}.list-card{padding:18px}.pagination-row{align-items:flex-start;flex-direction:column}.detail-grid{grid-template-columns:1fr}.detail-wide{grid-column:auto}}
@media(max-width:480px){.toolbar,.field-grid{grid-template-columns:1fr}.dialog-card{padding:20px}.history-actions{align-items:flex-end;flex-direction:column}.history-actions .v-pagination{margin:0 auto 0 0}}

*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px}.page-header p,.list-heading p{margin:0;color:#70817e;font-size:13px}.toolbar{display:grid;grid-template-columns:minmax(220px,.9fr) minmax(260px,1.6fr) auto;align-items:end;gap:14px;padding:16px 20px;margin-bottom:18px;border:1px solid #dce7e4;border-radius:12px;background:#fff}.toolbar label,.dialog-form label{display:block;margin-bottom:6px;color:#48625e;font-size:11px;font-weight:700}.result-count{display:grid;min-width:100px;padding:0 8px 5px;text-align:right}.result-count strong{color:#087f6e;font-size:18px}.result-count span{color:#70817e;font-size:10px}.list-card{padding:24px;border:1px solid #dce7e4!important;border-radius:12px!important}.list-heading{display:flex;justify-content:space-between;gap:18px;padding-bottom:18px;border-bottom:1px solid #e5ecea}.count-badge{min-width:34px;height:30px;display:grid;place-items:center;border-radius:8px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.list-progress{margin-top:12px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 10px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}td{padding:13px 10px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px}tbody tr:last-child td{border-bottom:0}.supplier-identity{min-width:205px;display:flex;align-items:center;gap:10px}.supplier-identity>span{width:36px;height:36px;flex:0 0 auto;display:grid;place-items:center;border-radius:9px;color:#087f6e;background:#e7f4f1;font-size:12px;font-weight:800}.supplier-identity strong,.supplier-identity small{display:block;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.supplier-identity strong{color:#294c47;font-size:11px}.supplier-identity small{margin-top:3px;color:#83918e;font-size:9px}.address-cell{max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.actions-heading{text-align:right}.row-actions{display:flex;justify-content:flex-end;gap:5px}.icon-btn{width:32px;height:32px;display:grid;place-items:center;border:0;border-radius:8px;color:#087f6e;background:#e7f4f1;cursor:pointer}.icon-btn:hover{background:#d6eee8}.icon-btn svg{width:17px;height:17px}.pagination-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:14px;border-top:1px solid #e8eeec;color:#70817e;font-size:10px}.empty-state,.empty-card{color:#70817e;text-align:center}.empty-state{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center}.empty-state>div,.empty-icon{width:42px;height:42px;display:grid;place-items:center;margin-bottom:12px;border-radius:12px;color:#087f6e;background:#e7f4f1;font-weight:800}.empty-state strong,.empty-card h2{color:#365751;font-size:12px}.empty-state p,.empty-card p{margin:5px 0 14px;font-size:11px}.empty-card{padding:42px;border:1px solid #dce7e4!important;border-radius:12px!important;background:#fff!important}.empty-card .empty-icon{margin:0 auto 14px}.permission-empty,.notice{padding:18px;border:1px dashed #b9d6d0;border-radius:12px;color:#647975;background:#f8fcfb;font-size:12px}.notice{display:flex;align-items:center;justify-content:space-between;border-style:solid}.error-notice{border-color:#f2cbc8;color:#9b3e3e;background:#fff4f3}.dialog-card{padding:26px;border-radius:12px!important}.dialog-form{display:grid;gap:8px;margin-top:18px}.required-mark{color:#b42318}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 20px;margin:18px 0 0}.detail-grid>div{padding:12px 0;border-bottom:1px solid #edf1f0}.detail-grid dt{margin-bottom:5px;color:#82908d;font-size:9px;font-weight:800;text-transform:uppercase}.detail-grid dd{margin:0;color:#294c47;font-size:12px;line-height:1.55;overflow-wrap:anywhere}.detail-wide{grid-column:1/-1}.history-table-wrap td{white-space:nowrap}.history-empty{min-height:190px}.history-actions{align-items:center}.history-actions .v-pagination{margin-right:auto}.batch-status{display:inline-block;padding:4px 7px;border-radius:6px;color:#087f6e;background:#e7f4f1;font-size:9px;font-weight:700}.batch-status--ready_for_sale{color:#9a6519;background:#fff1d9}.batch-status--sold{color:#1e6d9b;background:#e7f2fb}.batch-status--failed,.batch-status--cancelled{color:#a33c3c;background:#ffebea}
@media(max-width:760px){.page-header{align-items:stretch;flex-direction:column}.toolbar{grid-template-columns:1fr 1fr}.result-count{text-align:left}.list-card{padding:18px}.pagination-row{align-items:flex-start;flex-direction:column}.detail-grid{grid-template-columns:1fr}.detail-wide{grid-column:auto}}
@media(max-width:480px){.toolbar,.field-grid{grid-template-columns:1fr}.dialog-card{padding:20px}.history-actions{align-items:flex-end;flex-direction:column}.history-actions .v-pagination{margin:0 auto 0 0}}
</style>
