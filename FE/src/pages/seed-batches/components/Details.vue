<script setup>
const props = defineProps({ model: { type: Object, required: true } })
const { detailDialog, selectedBatch, statusNames, speciesNames, formatDate, formatQuantity } = props.model
</script>

<template>
  <v-dialog v-model="detailDialog" max-width="760" scrollable>
    <v-card class="dialog-card">
      <template v-if="selectedBatch">
        <h2>{{ selectedBatch.batchCode }}</h2>
        <p>{{ speciesNames[selectedBatch.species] || selectedBatch.species }} · {{ selectedBatch.developmentStage }}</p>
        <dl class="detail-grid">
          <div><dt>Trạng thái</dt><dd>{{ statusNames[selectedBatch.status] }}</dd></div>
          <div><dt>Ao/bể</dt><dd>{{ selectedBatch.tank?.name }}</dd></div>
          <div><dt>Khu vực</dt><dd>{{ selectedBatch.tank?.area?.name || 'Toàn trại' }}</dd></div>
          <div><dt>Nhà cung cấp</dt><dd>{{ selectedBatch.supplier?.name || '—' }}</dd></div>
          <div><dt>Số lượng ban đầu</dt><dd>{{ formatQuantity(selectedBatch.initialQuantity) }}</dd></div>
          <div><dt>Số lượng hiện tại</dt><dd>{{ formatQuantity(selectedBatch.currentEstimatedQuantity) }}</dd></div>
          <div><dt>Ngày thả</dt><dd>{{ formatDate(selectedBatch.stockedDate) }}</dd></div>
          <div><dt>Dự kiến bán</dt><dd>{{ formatDate(selectedBatch.expectedSaleDate) }}</dd></div>
          <div><dt>Ngày tạo</dt><dd>{{ formatDate(selectedBatch.createdAt) }}</dd></div>
          <div><dt>Cập nhật gần nhất</dt><dd>{{ formatDate(selectedBatch.updatedAt) }}</dd></div>
          <div><dt>Ghi chú</dt><dd>{{ selectedBatch.notes || '—' }}</dd></div>
        </dl>
      </template>
      <div class="dialog-actions"><v-btn variant="text" @click="detailDialog = false">Đóng</v-btn></div>
    </v-card>
  </v-dialog>
</template>
<style scoped>
*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}.detail-subtitle{margin:0;color:#70817e;font-size:13px}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 9px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}td{padding:13px 9px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;vertical-align:middle}tbody tr:last-child td{border-bottom:0}td strong,td small{display:block}td strong{color:#214c46;font-size:11px}td small{margin-top:4px;color:#899693;font-size:10px}.status-action{padding:6px 8px;border:1px solid #bfdcd5;border-radius:6px;color:#087f6e;background:white;font-size:10px;cursor:pointer}.status-tag{display:inline-block;padding:5px 8px;border-radius:6px;background:#edf2f0;color:#65736f;font-size:9px;font-weight:750;white-space:nowrap}.status-active{background:#e0f3ed;color:#087f6e}.status-ready_for_sale{background:#fff2d4;color:#8a5a00}.status-sold{background:#e8efff;color:#3357a5}.status-failed,.status-cancelled{background:#fde9e7;color:#a33c34}.dialog-card{padding:26px!important;border-radius:10px!important}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.detail-subtitle{margin-bottom:20px}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:20px 0 0}.detail-grid div{min-width:0}.detail-grid dt{margin-bottom:4px;color:#87938f;font-size:10px}.detail-grid dd{margin:0;color:#244b46;font-size:12px;overflow-wrap:anywhere}.detail-wide{grid-column:span 2}
.media-preview{display:block;max-width:100%;max-height:280px;margin-top:10px;border:1px solid #dce7e4;border-radius:7px;object-fit:contain}.document-preview{display:block;width:100%;height:320px;margin-top:10px;border:1px solid #dce7e4;border-radius:7px;background:#f7faf9}.detail-grid dd a{width:max-content;color:#087f6e;font-size:11px}
.batch-history-section{padding-top:18px;margin-top:20px;border-top:1px solid #e5ecea}.history-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.history-section-heading h3{margin:0;color:#244b46;font-size:14px}.history-section-heading p,.history-empty{margin:4px 0 0;color:#788984;font-size:11px}.history-list{display:grid;gap:8px}.history-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:11px 12px;border:1px solid #e5ecea;border-radius:7px}.history-row strong,.history-row small{display:block}.history-row strong{color:#244b46;font-size:12px}.history-row small{margin-top:4px;color:#788984;font-size:10px;line-height:1.45}.history-row b{flex:0 0 auto;font-size:13px}.quantity-negative{color:#a33c34}.quantity-positive{color:#087f6e}
.status-processing{background:#e7f0ff;color:#315fa8}
@media(max-width:900px){th,td{padding-inline:8px}}
@media(max-width:600px){.detail-grid{grid-template-columns:1fr}.detail-wide{grid-column:auto}.dialog-card{padding:18px!important}}



*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}.detail-subtitle{margin:0;color:#70817e;font-size:13px}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 9px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}td{padding:13px 9px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;vertical-align:middle}tbody tr:last-child td{border-bottom:0}td strong,td small{display:block}td strong{color:#214c46;font-size:11px}td small{margin-top:4px;color:#899693;font-size:10px}.status-action{padding:6px 8px;border:1px solid #bfdcd5;border-radius:6px;color:#087f6e;background:white;font-size:10px;cursor:pointer}.status-tag{display:inline-block;padding:5px 8px;border-radius:6px;background:#edf2f0;color:#65736f;font-size:9px;font-weight:750;white-space:nowrap}.status-active{background:#e0f3ed;color:#087f6e}.status-ready_for_sale{background:#fff2d4;color:#8a5a00}.status-sold{background:#e8efff;color:#3357a5}.status-failed,.status-cancelled{background:#fde9e7;color:#a33c34}.dialog-card{padding:26px!important;border-radius:10px!important}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px}.span-2{grid-column:span 2}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.detail-subtitle{margin-bottom:20px}
.status-processing{background:#e7f0ff;color:#315fa8}
@media(max-width:900px){th,td{padding-inline:8px}}
@media(max-width:600px){.form-grid{grid-template-columns:1fr}.span-2{grid-column:auto}.dialog-card{padding:18px!important}}


*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}.detail-subtitle{margin:0;color:#70817e;font-size:13px}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 9px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}td{padding:13px 9px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;vertical-align:middle}tbody tr:last-child td{border-bottom:0}td strong,td small{display:block}td strong{color:#214c46;font-size:11px}td small{margin-top:4px;color:#899693;font-size:10px}.status-action{padding:6px 8px;border:1px solid #bfdcd5;border-radius:6px;color:#087f6e;background:white;font-size:10px;cursor:pointer}.status-tag{display:inline-block;padding:5px 8px;border-radius:6px;background:#edf2f0;color:#65736f;font-size:9px;font-weight:750;white-space:nowrap}.status-active{background:#e0f3ed;color:#087f6e}.status-ready_for_sale{background:#fff2d4;color:#8a5a00}.status-sold{background:#e8efff;color:#3357a5}.status-failed,.status-cancelled{background:#fde9e7;color:#a33c34}.dialog-card{padding:26px!important;border-radius:10px!important}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px}.span-2{grid-column:span 2}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.detail-subtitle{margin-bottom:20px}.calculation-hint{margin:12px 0 0;color:#71817d;font-size:11px;line-height:1.5}
.status-processing{background:#e7f0ff;color:#315fa8}
@media(max-width:900px){th,td{padding-inline:8px}}
@media(max-width:600px){.form-grid{grid-template-columns:1fr}.span-2{grid-column:auto}.dialog-card{padding:18px!important}}
</style>
