<script setup>
import Pagination from '../../components/pagination/index.vue'
import { computed, ref as vueRef } from 'vue'
import Request from './components/Request.vue'
const requestDialog = vueRef(false)
import LoadingIndicator from '../../components/loading/index.vue'
import AppShell from '../../components/shell/index.vue'
import { usePage } from './composables/usePage.js'

const model = usePage()
const { supplies, loading, listLoading, error, query, categoryFilter, lowStockOnly, page, pageSize, pagination, deletingSupply, farmId, canManage, canRequestSupply, pageCount, categoryOptions, categoryNames, formatNumber, loadSupplies, applyFilters, openCreate, openEdit, openImport, openImportHistory, openAdjustment, openAdjustmentHistory, deleting, deleteSupply, saving, dialog, formRef, editingSupply, form, nameRules, unitRules, categoryRules, priceRules, thresholdRules, descriptionRules, saveSupply, ref, importDialog, importFormRef, importing, importTarget, importForm, importHistoryDialog, importHistoryLoading, importHistory, requiredRule, importQuantityRule, importPriceRule, importDateRule, submitImport, formatDateTime, adjustmentDialog, adjustmentFormRef, adjusting, adjustmentTarget, adjustmentForm, adjustmentHistoryDialog, adjustmentHistoryLoading, adjustmentHistory, adjustmentQuantityRule, adjustmentDateRule, submitAdjustment } = model
const tableHeaders = computed(() => [{"title":"Vật tư","key":"name","sortable":false},{"title":"Nhóm","key":"category","sortable":false},{"title":"Đơn vị","key":"unit","sortable":false},{"title":"Tồn hiện tại","key":"quantity","sortable":false},{"title":"Đơn giá","key":"unitPrice","sortable":false},{"title":"Ngưỡng cảnh báo","key":"minThreshold","sortable":false},{"title":"Thao tác","key":"actions","sortable":false,"align":"end"}].filter(header => canManage.value || header.key !== 'actions'))
</script>

<template>

  <AppShell>
    <section class="supplies-page">
      <header class="page-heading">
        <div class="section-page-title"><v-avatar color="primary" variant="tonal" rounded="lg" size="44"><v-icon icon="mdi-archive-outline" size="25" /></v-avatar><h1>Danh mục vật tư</h1></div>
      </header>
      <div class="page-actions list-actions"><v-btn v-if="canRequestSupply && farmId" variant="outlined" prepend-icon="mdi-clipboard-list-outline" @click="requestDialog = true">Yêu cầu cấp</v-btn>
          <v-btn v-if="canManage && farmId" color="primary" prepend-icon="mdi-plus" @click="openCreate">Thêm vật tư</v-btn></div>

      <v-card class="list-card" elevation="0">
      <div class="list-toolbar">
        <div class="list-filters"><v-select v-model="categoryFilter" :items="categoryOptions" label="Nhóm vật tư" clearable density="compact" variant="outlined" hide-details />
        <v-select v-model="lowStockOnly" :items="[{ title: 'Tất cả', value: false }, { title: 'Sắp hết', value: true }]" label="Cảnh báo số lượng" density="compact" variant="outlined" hide-details />
        </div>
        <v-text-field class="list-search" v-model="query" placeholder="Tìm tên vật tư" prepend-inner-icon="mdi-magnify" clearable density="compact" variant="outlined" hide-details />
      </div>

      <LoadingIndicator v-if="loading" />
      <div v-else-if="error" class="state-message error-state">{{ error }}</div>
      <div v-else-if="!farmId" class="state-message">Chọn trang trại để xem vật tư.</div>
      <div v-else class="supplies-list">
        <v-data-table-server class="app-data-table supplies-table" density="comfortable" :headers="tableHeaders" :items="supplies" :items-length="pagination.total" :loading="listLoading" v-model:page="page" v-model:items-per-page="pageSize" :items-per-page-options="[10, 25, 50, 100]" items-per-page-text="Số dòng" page-text="{0}–{1} / {2}">
          <template #body>
          <tbody>
            <tr v-for="item in supplies" :key="item.id">
              <td><strong>{{ item.name }}</strong><small v-if="item.description" class="description">{{ item.description }}</small></td>
              <td>{{ categoryNames[item.category] || item.category }}</td>
              <td>{{ item.unit }}</td>
              <td><span :class="['quantity', { low: item.isBelowThreshold }]">{{ formatNumber(item.quantity) }} {{ item.unit }}</span><small v-if="item.isBelowThreshold" class="low-note">Sắp hết</small></td>
              <td>{{ formatNumber(item.unitPrice, 2) }}</td>
              <td>{{ formatNumber(item.minThreshold) }} {{ item.unit }}</td>
              <td v-if="canManage" class="action-col">
                <v-btn icon="mdi-tray-arrow-down" variant="text" size="small" :aria-label="`Nhập kho ${item.name}`" title="Nhập kho" @click="openImport(item)" />
                <v-btn icon="mdi-history" variant="text" size="small" :aria-label="`Lịch sử nhập kho ${item.name}`" title="Lịch sử nhập kho" @click="openImportHistory(item)" />
                <v-btn icon="mdi-swap-vertical" variant="text" size="small" :aria-label="`Điều chỉnh tồn ${item.name}`" title="Điều chỉnh tồn kho" @click="openAdjustment(item)" />
                <v-btn icon="mdi-history" variant="text" size="small" :aria-label="`Lịch sử điều chỉnh ${item.name}`" title="Lịch sử điều chỉnh" @click="openAdjustmentHistory(item)" />
                <v-btn icon="mdi-pencil-outline" variant="text" size="small" :aria-label="`Sửa ${item.name}`" title="Cập nhật vật tư" @click="openEdit(item)" />
                <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" :aria-label="`Xóa ${item.name}`" title="Xóa vật tư" @click="deletingSupply = item" />
              </td>
            </tr>
            <tr v-if="!listLoading && !supplies.length"><td :colspan="canManage ? 7 : 6" class="empty-row">{{ lowStockOnly ? 'Không có vật tư nào sắp hết.' : 'Chưa có vật tư phù hợp.' }}</td></tr>
          </tbody>
        </template><template #bottom /></v-data-table-server>
        <Pagination v-model:page="page" v-model:page-size="pageSize" :total="pagination.total" :loading="listLoading" />
</div>

      </v-card>

      <v-dialog v-model="requestDialog" max-width="560"><Request v-if="requestDialog" :key="farmId" @close="requestDialog = false" /></v-dialog>
      <v-dialog v-model="dialog" max-width="650">
        <v-card class="form-card">
          <v-card-title>{{ editingSupply ? 'Cập nhật vật tư' : 'Thêm vật tư' }}</v-card-title>
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="saveSupply">
              <div class="form-grid">
                <v-text-field v-model="form.name" label="Tên vật tư *" :rules="nameRules" />
                <v-select v-model="form.category" :items="categoryOptions" label="Nhóm vật tư *" :rules="categoryRules" />
                <v-text-field v-model="form.unit" label="Đơn vị tính *" placeholder="kg, lít, bao..." :rules="unitRules" />
                <v-text-field v-model="form.unitPrice" type="number" min="0" step="0.01" label="Đơn giá *" :rules="priceRules" />
                <v-text-field v-model="form.minThreshold" type="number" min="0" step="0.001" label="Ngưỡng cảnh báo *" :rules="thresholdRules" />
                <v-text-field v-if="!editingSupply" model-value="0" label="Tồn ban đầu" readonly hint="Tồn kho chỉ thay đổi qua giao dịch nhập/xuất/điều chỉnh." persistent-hint />
                <v-textarea v-model="form.description" label="Mô tả" rows="2" maxlength="4000" counter="4000" class="full-width" :rules="descriptionRules" />
              </div>
            </v-form>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="saving" @click="dialog = false">Hủy</v-btn><v-btn color="primary" :loading="saving" @click="saveSupply">Lưu</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    <v-dialog v-model="importDialog" max-width="580">
        <v-card class="form-card">
          <v-card-title>Nhập kho{{ importTarget ? ` · ${importTarget.name}` : '' }}</v-card-title>
          <v-card-text>
            <v-form ref="importFormRef" @submit.prevent="submitImport">
              <div class="form-grid">
                <v-text-field :model-value="importTarget?.unit" label="Đơn vị" readonly />
                <v-text-field v-model="importForm.quantity" type="number" min="0.001" max="999999999.999" step="0.001" label="Số lượng nhập *" :rules="[requiredRule('Số lượng nhập'), importQuantityRule]" />
                <v-text-field v-model="importForm.unitPrice" type="number" min="0" max="9999999999.99" step="0.01" label="Đơn giá nhập *" :rules="[requiredRule('Đơn giá nhập'), importPriceRule]" />
                <v-text-field v-model="importForm.transactionDate" type="datetime-local" label="Thời gian nhập *" :rules="[importDateRule]" />
                <v-textarea v-model="importForm.notes" label="Ghi chú / mã hóa đơn" rows="2" maxlength="4000" counter="4000" class="full-width" />
              </div>
            </v-form>
            <p class="import-note">Lịch sử nhập kho được lưu; tồn hiện tại và đơn giá vật tư được cập nhật cùng giao dịch.</p>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="importing" @click="importDialog = false">Hủy</v-btn><v-btn color="primary" :loading="importing" @click="submitImport">Xác nhận nhập</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
<v-dialog v-model="importHistoryDialog" max-width="760">
        <v-card class="form-card">
          <v-card-title>Lịch sử nhập kho{{ importTarget ? ` · ${importTarget.name}` : '' }}</v-card-title>
          <v-card-text>
            <LoadingIndicator v-if="importHistoryLoading" />
            <div v-else-if="!importHistory.length" class="state-message">Chưa có giao dịch nhập kho.</div>
            <div v-else class="history-table-wrap"><v-table class="app-data-table" density="comfortable">
              <thead><tr><th>Thời gian</th><th>Số lượng</th><th>Đơn giá</th><th>Người nhập</th><th>Ghi chú</th></tr></thead>
              <tbody><tr v-for="item in importHistory" :key="item.id"><td>{{ formatDateTime(item.transactionDate) }}</td><td>{{ formatNumber(item.quantity) }} {{ item.supply.unit }}</td><td>{{ formatNumber(item.unitPrice, 2) }}</td><td>{{ item.creator.displayName || item.creator.email }}</td><td>{{ item.notes || '—' }}</td></tr></tbody>
            </v-table></div>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" @click="importHistoryDialog = false">Đóng</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    <v-dialog v-model="adjustmentDialog" max-width="580">
        <v-card class="form-card">
          <v-card-title>Điều chỉnh tồn kho{{ adjustmentTarget ? ` · ${adjustmentTarget.name}` : '' }}</v-card-title>
          <v-card-text>
            <p class="adjustment-stock">Tồn hiện tại: <strong>{{ formatNumber(adjustmentTarget?.quantity) }} {{ adjustmentTarget?.unit }}</strong></p>
            <v-form ref="adjustmentFormRef" @submit.prevent="submitAdjustment">
              <div class="form-grid">
                <v-select v-model="adjustmentForm.direction" :items="[{ title: 'Tăng tồn', value: 'increase' }, { title: 'Giảm tồn', value: 'decrease' }]" label="Chiều điều chỉnh *" />
                <v-text-field :model-value="adjustmentTarget?.unit" label="Đơn vị" readonly />
                <v-text-field v-model="adjustmentForm.quantity" type="number" min="0.001" max="999999999.999" step="0.001" label="Số lượng điều chỉnh *" :rules="[requiredRule('Số lượng'), adjustmentQuantityRule]" />
                <v-text-field v-model="adjustmentForm.transactionDate" type="datetime-local" label="Thời điểm *" :rules="[adjustmentDateRule]" />
                <v-textarea v-model="adjustmentForm.reason" label="Lý do điều chỉnh *" rows="2" maxlength="4000" counter="4000" class="full-width" :rules="[requiredRule('Lý do')]" />
              </div>
            </v-form>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="adjusting" @click="adjustmentDialog = false">Hủy</v-btn><v-btn color="primary" :loading="adjusting" @click="submitAdjustment">Lưu điều chỉnh</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
<v-dialog v-model="adjustmentHistoryDialog" max-width="760">
        <v-card class="form-card">
          <v-card-title>Lịch sử điều chỉnh{{ adjustmentTarget ? ` · ${adjustmentTarget.name}` : '' }}</v-card-title>
          <v-card-text>
            <LoadingIndicator v-if="adjustmentHistoryLoading" />
            <div v-else-if="!adjustmentHistory.length" class="state-message">Chưa có giao dịch điều chỉnh.</div>
            <div v-else class="history-table-wrap"><v-table class="app-data-table" density="comfortable">
              <thead><tr><th>Thời gian</th><th>Biến động</th><th>Tồn thay đổi</th><th>Người ghi</th><th>Lý do</th></tr></thead>
              <tbody><tr v-for="item in adjustmentHistory" :key="item.id"><td>{{ formatDateTime(item.transactionDate) }}</td><td>{{ Number(item.quantity) > 0 ? 'Tăng' : 'Giảm' }}</td><td>{{ formatNumber(Math.abs(Number(item.quantity))) }} {{ item.supply.unit }}</td><td>{{ item.creator.displayName || item.creator.email }}</td><td>{{ item.notes }}</td></tr></tbody>
            </v-table></div>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" @click="adjustmentHistoryDialog = false">Đóng</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
<v-dialog :model-value="Boolean(deletingSupply)" max-width="460" @update:model-value="(value) => { if (!value && !deleting.value) deletingSupply = null }">
        <v-card class="form-card">
          <v-card-title>Xóa vật tư</v-card-title>
          <v-card-text>
            <p v-if="deletingSupply">Bạn có chắc muốn xóa <strong>{{ deletingSupply.name }}</strong>?</p>
            <p class="delete-note">Chỉ vật tư chưa có tồn kho và chưa phát sinh giao dịch mới được xóa. Mặt hàng thức ăn đang được dùng trong nhật ký cho ăn có thể tiếp tục được lưu theo tên đã ghi nhận.</p>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="deleting" @click="deletingSupply = null">Hủy</v-btn><v-btn color="error" :loading="deleting" @click="deleteSupply">Xóa</v-btn></v-card-actions>
        </v-card>
      </v-dialog>

    </section>
  </AppShell>

</template>

<style scoped>
.supplies-list { min-width: 0; }
.supplies-list :deep(.empty-row) { text-align: center !important; }
.supplies-page { color:#173f3a; }
.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:24px; }.heading-actions { display:flex; flex-wrap:wrap; gap:8px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; }
h1 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { margin:8px 0 0; color:#71827e; font-size:13px; }
.filter-row { display:grid; grid-template-columns:minmax(200px,1fr) minmax(170px,.75fr) auto auto; align-items:center; gap:12px; margin-bottom:17px; }
.state-message { padding:34px 20px; border:1px solid #dbe9e5; border-radius:8px; color:#71827e; background:#fff; text-align:center; }
.error-state { color:#a33b3b; }
.table-wrap { overflow:hidden; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }
.supplies-table :deep(th) { color:#71827e; font-size:10px; font-weight:800; text-transform:uppercase; white-space:nowrap; }
.supplies-table :deep(td) { color:#34514c; font-size:12px; }
.description,.low-note { display:block; margin-top:3px; max-width:260px; overflow:hidden; color:#83918e; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
.quantity { font-weight:700; }.quantity.low,.low-note { color:#b34a32; }
.action-col { min-width:230px; text-align:right !important; white-space:nowrap; }
.empty-row { height:100px; color:#83918e !important; text-align:center; }
.table-footer { display:flex; align-items:center; justify-content:space-between; min-height:52px; padding:0 14px; border-top:1px solid #e5eeeb; color:#71827e; font-size:11px; }
.pager { display:flex; align-items:center; gap:8px; }
.form-card { border-radius:8px !important; }.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }.form-card :deep(.v-card-text) { padding:12px 22px; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 14px; }.full-width { grid-column:1/-1; }
.delete-note { margin-top:10px; color:#71827e; font-size:13px; }
.import-note { margin:8px 0 0; color:#71827e; font-size:12px; line-height:1.5; }.history-table-wrap { overflow:auto; border:1px solid #dbe9e5; border-radius:6px; }.history-table-wrap :deep(th) { color:#71827e; font-size:10px; text-transform:uppercase; white-space:nowrap; }.history-table-wrap :deep(td) { color:#34514c; font-size:12px; }
.adjustment-stock { margin:0 0 12px; color:#71827e; font-size:13px; }.adjustment-stock strong { color:#173f3a; }
@media(max-width:760px) { .page-heading { align-items:flex-start; flex-direction:column; }.filter-row { grid-template-columns:1fr 1fr; }.filter-row .v-btn { grid-column:1/-1; }.table-wrap { overflow-x:auto; }.form-grid { grid-template-columns:1fr; }.full-width { grid-column:auto; } }


h1 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.description { display:block; margin-top:3px; max-width:260px; overflow:hidden; color:#83918e; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
.form-card { border-radius:8px !important; }.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }.form-card :deep(.v-card-text) { padding:12px 22px; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 14px; }.full-width { grid-column:1/-1; }
@media(max-width:760px) {.filter-row .v-btn { grid-column:1/-1; }.form-grid { grid-template-columns:1fr; }.full-width { grid-column:auto; } }


h1 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.state-message { padding:34px 20px; border:1px solid #dbe9e5; border-radius:8px; color:#71827e; background:#fff; text-align:center; }
.table-wrap { overflow:hidden; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }
.quantity { font-weight:700; }.quantity.low { color:#b34a32; }
.form-card { border-radius:8px !important; }.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }.form-card :deep(.v-card-text) { padding:12px 22px; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 14px; }.full-width { grid-column:1/-1; }
.import-note { margin:8px 0 0; color:#71827e; font-size:12px; line-height:1.5; }.history-table-wrap { overflow:auto; border:1px solid #dbe9e5; border-radius:6px; }.history-table-wrap :deep(th) { color:#71827e; font-size:10px; text-transform:uppercase; white-space:nowrap; }.history-table-wrap :deep(td) { color:#34514c; font-size:12px; }
@media(max-width:760px) {.filter-row .v-btn { grid-column:1/-1; }.table-wrap { overflow-x:auto; }.form-grid { grid-template-columns:1fr; }.full-width { grid-column:auto; } }


h1 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.state-message { padding:34px 20px; border:1px solid #dbe9e5; border-radius:8px; color:#71827e; background:#fff; text-align:center; }
.table-wrap { overflow:hidden; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }
.quantity { font-weight:700; }.quantity.low { color:#b34a32; }
.form-card { border-radius:8px !important; }.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }.form-card :deep(.v-card-text) { padding:12px 22px; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 14px; }.full-width { grid-column:1/-1; }.history-table-wrap { overflow:auto; border:1px solid #dbe9e5; border-radius:6px; }.history-table-wrap :deep(th) { color:#71827e; font-size:10px; text-transform:uppercase; white-space:nowrap; }.history-table-wrap :deep(td) { color:#34514c; font-size:12px; }
.adjustment-stock { margin:0 0 12px; color:#71827e; font-size:13px; }.adjustment-stock strong { color:#173f3a; }
@media(max-width:760px) {.filter-row .v-btn { grid-column:1/-1; }.table-wrap { overflow-x:auto; }.form-grid { grid-template-columns:1fr; }.full-width { grid-column:auto; } }
</style>
