<script setup>
import AppShell from '../../components/shell/index.vue'
import Form from './components/Form.vue'
import Details from './components/Details.vue'
import Quality from './components/Quality.vue'
import Inspection from './components/Inspection.vue'
import History from './components/History.vue'
import { usePage } from './composables/usePage.js'

const model = usePage()
const { farms, batches, loading, listLoading, error, search, statusFilter, page, pagination, farmId, selectedFarm, role, canView, canManage, isTechnician, pageCount, statusOptions, statusNames, speciesNames, transitions, formatDate, formatQuantity, openInspectionUpload, openQualityHistory, openQualityForm, loadPage, openCreate, openEdit, openDetails, openStatus, statusSaving, statusDialog, selectedBatch, nextStatus, saveStatus, reviewDialog, reviewSaving, reviewForm, saveReview } = model
</script>

<template>

  <AppShell>
    <header class="page-header">
      <div><span class="eyebrow">SẢN XUẤT</span><h1>Lô giống</h1><p>Tiếp nhận, theo dõi thông tin và trạng thái các lô tôm giống theo ao/bể.</p></div>
      <v-btn v-if="canManage && selectedFarm" color="primary" prepend-icon="mdi-plus" @click="openCreate">Tiếp nhận lô</v-btn>
    </header>

    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />
    <div v-else-if="error" class="notice error-notice" role="alert"><span>{{ error }}</span><v-btn size="small" variant="text" color="error" @click="loadPage">Thử lại</v-btn></div>
    <template v-else-if="!farms.length">
      <v-card class="empty-card" elevation="0"><div class="empty-icon">+</div><h2>Chưa có trang trại</h2><p>Tạo hoặc tham gia trang trại trước khi quản lý lô giống.</p><v-btn to="/farms" color="primary" variant="outlined">Mở quản lý trang trại</v-btn></v-card>
    </template>
    <div v-else-if="!canView" class="permission-empty">Vai trò hiện tại không có quyền xem lô giống.</div>
    <template v-else>
      <section class="toolbar">
        <div class="toolbar-field farm-field"><label>Trang trại</label><v-select v-model="farmId" :items="farms" item-title="name" item-value="id" density="compact" variant="outlined" hide-details /></div>
        <div class="toolbar-field"><label>Tìm lô</label><v-text-field v-model="search" placeholder="Mã lô, mã nhà cung cấp, loài" prepend-inner-icon="mdi-magnify" clearable density="compact" variant="outlined" hide-details /></div>
        <div class="toolbar-field"><label>Trạng thái</label><v-select v-model="statusFilter" :items="[{ title: 'Tất cả trạng thái', value: '' }, ...statusOptions]" density="compact" variant="outlined" hide-details /></div>
        <div class="result-count"><strong>{{ pagination.total }}</strong><span>lô giống</span></div>
      </section>

      <v-card class="list-card" elevation="0">
        <div class="list-heading"><div><span class="eyebrow">THEO DÕI SẢN XUẤT</span><h2>{{ selectedFarm?.name }}</h2><p>Danh sách lô giống trong phạm vi quyền hiện tại.</p></div><span class="count-badge">{{ pagination.total }}</span></div>
        <v-progress-linear v-if="listLoading" class="list-progress" indeterminate color="primary" rounded />
        <div v-else-if="!batches.length" class="empty-state"><div>{{ search || statusFilter ? '⌕' : '0' }}</div><strong>{{ search || statusFilter ? 'Không tìm thấy lô phù hợp' : 'Chưa có lô giống' }}</strong><p>{{ canManage ? 'Tiếp nhận lô mới vào một ao/bể đang trống.' : 'Lô giống sẽ xuất hiện tại đây khi được tiếp nhận.' }}</p><v-btn v-if="canManage && !search && !statusFilter" color="primary" variant="outlined" size="small" @click="openCreate">Tiếp nhận lô</v-btn></div>
        <div v-else class="table-wrap"><table class="app-data-table">
          <thead><tr><th>Mã lô</th><th>Loài / giai đoạn</th><th>Ao/bể</th><th>Nhà cung cấp</th><th>Số lượng hiện tại</th><th>Ngày thả</th><th>Trạng thái</th><th class="actions-heading">Thao tác</th></tr></thead>
          <tbody><tr v-for="batch in batches" :key="batch.id">
            <td><strong>{{ batch.batchCode }}</strong><small>Mã NCC: {{ batch.supplierLotCode }}</small></td>
            <td>{{ speciesNames[batch.species] || batch.species }}<small>{{ batch.developmentStage }}</small></td>
            <td>{{ batch.tank?.code }}<small>{{ batch.tank?.area?.name || 'Toàn trại' }}</small></td>
            <td>{{ batch.supplier?.name || batch.source || '—' }}</td>
            <td>{{ formatQuantity(batch.currentEstimatedQuantity) }}<small>Ban đầu {{ formatQuantity(batch.initialQuantity) }}</small></td>
            <td>{{ formatDate(batch.stockedDate) }}</td>
            <td><span class="status-tag" :class="`status-${batch.status}`">{{ statusNames[batch.status] || batch.status }}</span></td>
            <td><div class="row-actions"><button class="icon-btn" type="button" title="Xem chi tiết" aria-label="Xem chi tiết lô" @click="openDetails(batch)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/></svg></button><button v-if="canView" class="status-action" type="button" @click="openInspectionUpload(batch)">Ảnh AI</button><button v-if="isTechnician" class="status-action" type="button" @click="openQualityForm(batch)">Ghi kiểm tra</button><button class="status-action" type="button" @click="openQualityHistory(batch)">Chất lượng</button><button v-if="batch.status !== 'sold' && batch.status !== 'cancelled' && batch.status !== 'failed'" class="icon-btn" type="button" title="Cập nhật thông tin" aria-label="Cập nhật lô" @click="openEdit(batch)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button><button v-if="canManage && transitions[batch.status]?.length" class="status-action" type="button" @click="openStatus(batch)">Trạng thái</button></div></td>
          </tr></tbody>
        </table></div>
        <div v-if="!listLoading && pagination.pageCount > 1" class="pagination-row"><span>{{ pagination.total }} kết quả · Trang {{ page }}/{{ pageCount }}</span><v-pagination v-model="page" :length="pageCount" :total-visible="5" density="compact" rounded="lg" /></div>
      </v-card>
    </template>

    <Form :model="model" />
    <Details :model="model" />
    
    
    <Quality :model="model" />
    <Inspection :model="model" />
    <History :model="model" />
    <v-dialog v-model="reviewDialog" max-width="540"><v-card class="dialog-card"><span class="eyebrow">DUYỆT KIỂM TRA</span><h2>{{ reviewForm.reviewStatus === 'confirmed' ? 'Xác nhận kết quả' : reviewForm.reviewStatus === 'action_required' ? 'Yêu cầu xử lý' : 'Xác nhận đã xử lý' }}</h2><v-textarea v-model="reviewForm.reviewNotes" :label="reviewForm.reviewStatus === 'confirmed' ? 'Ghi chú (không bắt buộc)' : 'Hướng xử lý / kết quả xử lý *'" maxlength="4000" rows="3" auto-grow hide-details="auto" /><div class="dialog-actions"><v-btn variant="text" @click="reviewDialog = false">Hủy</v-btn><v-btn color="primary" :loading="reviewSaving" @click="saveReview">Lưu quyết định</v-btn></div></v-card></v-dialog>
    <v-dialog v-model="statusDialog" max-width="480"><v-card class="dialog-card"><span class="eyebrow">VÒNG ĐỜI LÔ</span><h2>Cập nhật trạng thái</h2><p>{{ selectedBatch?.batchCode }} · {{ statusNames[selectedBatch?.status] }}</p><v-select v-model="nextStatus" :items="transitions[selectedBatch?.status] || []" label="Trạng thái mới" hide-details="auto"/><div class="dialog-actions"><v-btn variant="text" @click="statusDialog = false">Hủy</v-btn><v-btn color="primary" :disabled="!nextStatus" :loading="statusSaving" @click="saveStatus">Xác nhận</v-btn></div></v-card></v-dialog>

  </AppShell>

</template>

<style scoped>
*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px}.page-header p,.list-heading p,.detail-subtitle{margin:0;color:#70817e;font-size:13px}.toolbar{display:grid;grid-template-columns:minmax(200px,.9fr) minmax(230px,1.4fr) minmax(180px,.8fr) auto;align-items:end;gap:14px;padding:16px 20px;margin-bottom:18px;border:1px solid #dce7e4;border-radius:10px;background:#fff}.toolbar-field label,.dialog-form label{display:block;margin-bottom:6px;color:#48625e;font-size:11px;font-weight:700}.result-count{display:grid;min-width:78px;padding:0 8px 5px;text-align:right}.result-count strong{color:#087f6e;font-size:18px}.result-count span{color:#70817e;font-size:10px}.list-card{padding:24px;border:1px solid #dce7e4!important;border-radius:10px!important}.list-heading{display:flex;justify-content:space-between;gap:18px;padding-bottom:18px;border-bottom:1px solid #e5ecea}.count-badge{min-width:34px;height:30px;display:grid;place-items:center;border-radius:7px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.list-progress{margin-top:12px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 9px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}td{padding:13px 9px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;vertical-align:middle}tbody tr:last-child td{border-bottom:0}td strong,td small{display:block}td strong{color:#214c46;font-size:11px}td small{margin-top:4px;color:#899693;font-size:10px}.row-actions{display:flex;align-items:center;gap:5px;white-space:nowrap}.icon-btn{width:32px;height:32px;display:grid;place-items:center;border:0;border-radius:7px;color:#087f6e;background:#e7f4f1;cursor:pointer}.icon-btn svg{width:16px;height:16px}.status-action{padding:6px 8px;border:1px solid #bfdcd5;border-radius:6px;color:#087f6e;background:white;font-size:10px;cursor:pointer}.status-tag{display:inline-block;padding:5px 8px;border-radius:6px;background:#edf2f0;color:#65736f;font-size:9px;font-weight:750;white-space:nowrap}.status-active{background:#e0f3ed;color:#087f6e}.status-ready_for_sale{background:#fff2d4;color:#8a5a00}.status-sold{background:#e8efff;color:#3357a5}.status-failed,.status-cancelled{background:#fde9e7;color:#a33c34}.empty-state{display:grid;justify-items:center;padding:46px 20px;text-align:center}.empty-state>div{width:42px;height:42px;display:grid;place-items:center;margin-bottom:12px;border-radius:10px;background:#e7f4f1;color:#087f6e;font-size:20px}.empty-state strong{color:#214c46;font-size:14px}.empty-state p{margin:6px 0 14px;color:#7d8c88;font-size:12px}.pagination-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-top:14px;border-top:1px solid #e8eeec;color:#74827f;font-size:11px}.dialog-card{padding:26px!important;border-radius:10px!important}.dialog-form{display:grid;gap:9px;margin-top:18px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px}.span-2{grid-column:span 2}.required-mark{color:#c24137}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.detail-subtitle{margin-bottom:20px}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:20px 0 0}.detail-grid div{min-width:0}.detail-grid dt{margin-bottom:4px;color:#87938f;font-size:10px}.detail-grid dd{margin:0;color:#244b46;font-size:12px;overflow-wrap:anywhere}.detail-wide{grid-column:span 2}.permission-empty,.notice{padding:18px;border:1px solid #e0e9e6;border-radius:8px;background:#fff;color:#637873}.notice{display:flex;align-items:center;justify-content:space-between;gap:12px}.error-notice{color:#a33c34;border-color:#f0d1ce;background:#fff9f8}.empty-card{display:grid;justify-items:center;padding:48px 20px;border:1px solid #dce7e4!important;border-radius:10px!important;text-align:center}.empty-card h2{margin-top:12px}.empty-card p{color:#70817e;font-size:13px}.empty-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:10px;background:#e7f4f1;color:#087f6e;font-size:22px}
.quality-history{display:grid;gap:10px;margin-top:14px}.quality-entry{padding:14px;border:1px solid #e1eae7;border-radius:8px}.quality-entry-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.quality-entry-head strong{margin-right:auto;color:#214c46;font-size:13px}.quality-entry p{margin:9px 0 0;color:#657873;font-size:12px}.quality-entry a{display:inline-block;margin-top:8px;color:#087f6e;font-size:12px}.review-note{color:#8a5a00!important}.quality-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.upload-input{display:block;width:100%;padding:10px;border:1px solid #d6e2df;border-radius:7px;color:#48625e;font:inherit;font-size:12px}.upload-hint{margin-top:5px;color:#7d8c88;font-size:10px}.uploaded-file{display:flex;justify-content:space-between;gap:10px;margin-top:8px;color:#214c46;font-size:12px}.uploaded-file button{border:0;color:#a33c34;background:transparent;cursor:pointer}
.media-preview{display:block;max-width:100%;max-height:280px;margin-top:10px;border:1px solid #dce7e4;border-radius:7px;object-fit:contain}.document-preview{display:block;width:100%;height:320px;margin-top:10px;border:1px solid #dce7e4;border-radius:7px;background:#f7faf9}.evidence-preview{display:grid;gap:8px;margin-top:8px}.evidence-preview a,.detail-grid dd a{width:max-content;color:#087f6e;font-size:11px}
.batch-history-section{padding-top:18px;margin-top:20px;border-top:1px solid #e5ecea}.history-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.history-section-heading h3{margin:0;color:#244b46;font-size:14px}.history-section-heading p,.history-empty{margin:4px 0 0;color:#788984;font-size:11px}.history-list{display:grid;gap:8px}.history-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:11px 12px;border:1px solid #e5ecea;border-radius:7px}.history-row strong,.history-row small{display:block}.history-row strong{color:#244b46;font-size:12px}.history-row small{margin-top:4px;color:#788984;font-size:10px;line-height:1.45}.history-row b{flex:0 0 auto;font-size:13px}.quantity-negative{color:#a33c34}.quantity-positive{color:#087f6e}.calculation-hint{margin:12px 0 0;color:#71817d;font-size:11px;line-height:1.5}
.code-hint{display:block;margin-top:4px;color:#71817d;font-size:10px;line-height:1.4}
.status-processing{background:#e7f0ff;color:#315fa8}
.ai-upload-area{padding-bottom:20px;border-bottom:1px solid #e5ecea}
.ai-upload-area h3,.ai-result-panel h3{margin:0 0 5px;color:#244b46;font-size:14px}
.ai-upload-area>div:first-child p{margin:0 0 14px;color:#788984;font-size:11px;line-height:1.5}
.ai-upload-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 16px;align-items:start}
.ai-upload-fields>div{min-width:0}
.ai-upload-fields label{display:block;margin-bottom:6px;color:#48625e;font-size:11px;font-weight:700}
.ai-notes-field{grid-column:span 3}
.ai-upload-preview{display:flex;align-items:center;gap:12px;margin-top:12px;color:#48625e;font-size:11px}
.ai-upload-preview img{width:88px;height:68px;border:1px solid #dce7e4;border-radius:7px;object-fit:cover}
.ai-result-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:18px}
.ai-result-heading p{margin:0;color:#788984;font-size:11px}
.ai-result-actions{display:flex;align-items:center;gap:10px}
.ai-analysis-progress{margin-top:12px}
.ai-result-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(250px,1fr);gap:20px;padding-top:14px}
.ai-media-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}
.ai-media-grid figure{min-width:0;margin:0}
.ai-media-grid figcaption{margin-bottom:7px;color:#48625e;font-size:11px;font-weight:700}
.ai-media-grid a{display:grid;min-height:190px;place-items:center;border:1px solid #dce7e4;border-radius:7px;background:#f7faf9}
.ai-media-grid img{display:block;width:100%;max-height:330px;object-fit:contain}
.annotated-empty{display:grid;min-height:190px;place-items:center;padding:16px;border:1px dashed #cbdcd7;border-radius:7px;color:#788984;background:#f8fbfa;font-size:11px;text-align:center}
.ai-result-panel{min-width:0;padding-left:18px;border-left:1px solid #e5ecea}
.ai-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}
.ai-metrics>div{min-width:0}
.ai-metrics span,.ai-metrics strong{display:block;overflow-wrap:anywhere}
.ai-metrics span{margin-bottom:4px;color:#788984;font-size:10px}
.ai-metrics strong{color:#214c46;font-size:12px}
.ai-inspection-notes{margin:14px 0 0;padding-top:10px;border-top:1px solid #e5ecea;color:#657873;font-size:11px;line-height:1.5;white-space:pre-wrap}
.ai-history-section{padding-top:18px;margin-top:18px;border-top:1px solid #e5ecea}
.ai-history-selected{background:#eef8f5}
.ai-history-section tbody tr{cursor:pointer}
.ai-history-section tbody tr:hover{background:#f3faf8}
.tabular{font-variant-numeric:tabular-nums;white-space:nowrap}
@media(max-width:900px){.toolbar{grid-template-columns:repeat(2,minmax(0,1fr))}.result-count{text-align:left}.list-card{padding:16px}.table-wrap{margin-inline:-8px}th,td{padding-inline:8px}}
@media(max-width:900px){.ai-result-layout{grid-template-columns:1fr}.ai-result-panel{padding:16px 0 0;border-top:1px solid #e5ecea;border-left:0}}
@media(max-width:600px){.page-header{align-items:flex-start;flex-direction:column}.page-header h1{font-size:1.8rem}.toolbar{grid-template-columns:1fr;padding:14px}.form-grid,.detail-grid{grid-template-columns:1fr}.span-2,.detail-wide{grid-column:auto}.dialog-card{padding:18px!important}.pagination-row{align-items:flex-start;flex-direction:column}.result-count{display:flex;align-items:baseline;gap:6px}.ai-upload-fields{grid-template-columns:1fr}.ai-notes-field{grid-column:auto}.ai-media-grid{grid-template-columns:1fr}.ai-result-heading{align-items:flex-start}.ai-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}


*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 9px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}td{padding:13px 9px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;vertical-align:middle}tbody tr:last-child td{border-bottom:0}td strong,td small{display:block}td strong{color:#214c46;font-size:11px}td small{margin-top:4px;color:#899693;font-size:10px}.status-action{padding:6px 8px;border:1px solid #bfdcd5;border-radius:6px;color:#087f6e;background:white;font-size:10px;cursor:pointer}.status-tag{display:inline-block;padding:5px 8px;border-radius:6px;background:#edf2f0;color:#65736f;font-size:9px;font-weight:750;white-space:nowrap}.status-active{background:#e0f3ed;color:#087f6e}.status-ready_for_sale{background:#fff2d4;color:#8a5a00}.status-sold{background:#e8efff;color:#3357a5}.status-failed,.status-cancelled{background:#fde9e7;color:#a33c34}.dialog-card{padding:26px!important;border-radius:10px!important}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
.status-processing{background:#e7f0ff;color:#315fa8}
@media(max-width:900px){th,td{padding-inline:8px}}
@media(max-width:600px){.dialog-card{padding:18px!important}}

*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 9px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}td{padding:13px 9px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;vertical-align:middle}tbody tr:last-child td{border-bottom:0}td strong,td small{display:block}td strong{color:#214c46;font-size:11px}td small{margin-top:4px;color:#899693;font-size:10px}.status-action{padding:6px 8px;border:1px solid #bfdcd5;border-radius:6px;color:#087f6e;background:white;font-size:10px;cursor:pointer}.status-tag{display:inline-block;padding:5px 8px;border-radius:6px;background:#edf2f0;color:#65736f;font-size:9px;font-weight:750;white-space:nowrap}.status-active{background:#e0f3ed;color:#087f6e}.status-ready_for_sale{background:#fff2d4;color:#8a5a00}.status-sold{background:#e8efff;color:#3357a5}.status-failed,.status-cancelled{background:#fde9e7;color:#a33c34}.dialog-card{padding:26px!important;border-radius:10px!important}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
.status-processing{background:#e7f0ff;color:#315fa8}
@media(max-width:900px){th,td{padding-inline:8px}}
@media(max-width:600px){.dialog-card{padding:18px!important}}

</style>
