<script setup>
const props = defineProps({ model: { type: Object, required: true } })
const { loading, error, inspectionDialog, aiInspections, selectedAiInspection, inspectionUploading, inspectionSaving, inspectionAnalyzingId, aiInspectionLoading, inspectionBatch, aiInspectionError, inspectionForm, role, formatTimestamp, aiInspectionStatusNames, aiInspectionStatusClasses, formatInspectionValue, loadAiInspectionHistory, runAiInspection, uploadInspectionImage, saveInspectionImage } = props.model
</script>

<template>
<v-dialog v-model="inspectionDialog" max-width="1040" scrollable><v-card class="dialog-card ai-dialog"><span class="eyebrow">MEDIA MANAGEMENT · AI INSPECTION</span><h2>Kiểm tra mẫu bằng AI</h2><p class="detail-subtitle">{{ inspectionBatch?.batchCode }} · {{ inspectionBatch?.tank?.name || inspectionBatch?.tank?.code }}</p>
      <section class="ai-upload-area"><div><h3>Tải ảnh kiểm tra</h3><p>Ảnh sẽ được lưu cùng hồ sơ lô giống. Ảnh annotate và kết quả sẽ hiển thị khi AI trả dữ liệu.</p></div><div class="ai-upload-fields">
        <div><label>Ảnh mẫu *</label><input class="upload-input" type="file" accept="image/jpeg,image/png,image/webp" :disabled="inspectionUploading || inspectionSaving" @change="uploadInspectionImage"><div class="upload-hint">JPG, PNG hoặc WEBP · tối đa 10 MB</div></div>
        <div><label>Phương pháp lấy mẫu *</label><v-select v-model="inspectionForm.samplingMethod" :items="[{ title: 'AI', value: 'ai' }, { title: 'Thủ công', value: 'manual' }, { title: 'Kết hợp', value: 'combined' }]" hide-details="auto" /></div>
        <div><label>Thể tích mẫu (ml)</label><v-text-field v-model="inspectionForm.sampleVolumeMl" type="number" min="0.001" max="1000000" step="any" hide-details="auto" /></div>
        <div class="ai-notes-field"><label>Ghi chú</label><v-textarea v-model="inspectionForm.notes" maxlength="4000" rows="2" auto-grow hide-details="auto" /></div>
      </div><div v-if="inspectionForm.previewUrl" class="ai-upload-preview"><img :src="inspectionForm.previewUrl" :alt="`Ảnh mẫu đã tải lên: ${inspectionForm.filename}`"><span>{{ inspectionForm.filename }}</span></div>
      <div class="dialog-actions"><v-btn variant="text" :disabled="inspectionUploading || inspectionSaving" @click="inspectionDialog = false">Đóng</v-btn><v-btn color="primary" :loading="inspectionSaving" :disabled="inspectionUploading || !inspectionForm.mediaPublicId" @click="saveInspectionImage">Lưu ảnh kiểm tra</v-btn></div></section>

      <v-progress-linear v-if="aiInspectionLoading" indeterminate color="primary" />
      <div v-else-if="aiInspectionError" class="notice error-notice" role="alert"><span>{{ aiInspectionError }}</span><v-btn size="small" variant="text" @click="loadAiInspectionHistory(inspectionBatch)">Thử lại</v-btn></div>
      <p v-else-if="!aiInspections.length" class="history-empty">Chưa có lịch sử kiểm tra AI cho lô này.</p>
      <template v-else-if="selectedAiInspection">
        <div class="ai-result-heading"><div><span class="eyebrow">KẾT QUẢ ĐANG XEM</span><p>{{ formatTimestamp(selectedAiInspection.inspectedAt || selectedAiInspection.createdAt) }} · {{ selectedAiInspection.creator?.displayName || 'Người dùng' }}</p></div><div class="ai-result-actions"><span class="status-tag" :class="aiInspectionStatusClasses[selectedAiInspection.status]">{{ aiInspectionStatusNames[selectedAiInspection.status] || selectedAiInspection.status }}</span><v-btn v-if="['pending', 'failed'].includes(selectedAiInspection.status)" size="small" variant="outlined" color="primary" :disabled="!!inspectionAnalyzingId" @click="runAiInspection(selectedAiInspection)">Phân tích AI</v-btn></div></div>
        <v-progress-linear v-if="inspectionAnalyzingId === selectedAiInspection.id" indeterminate color="primary" class="ai-analysis-progress" />
        <div class="ai-result-layout"><section class="ai-media-grid"><figure><figcaption>Ảnh gốc</figcaption><a :href="selectedAiInspection.mediaUrl" target="_blank" rel="noopener noreferrer"><img :src="selectedAiInspection.mediaUrl" alt="Ảnh gốc của lần kiểm tra"></a></figure><figure v-if="selectedAiInspection.annotatedImageUrl"><figcaption>Ảnh đã đánh dấu kết quả AI</figcaption><a :href="selectedAiInspection.annotatedImageUrl" target="_blank" rel="noopener noreferrer"><img :src="selectedAiInspection.annotatedImageUrl" alt="Ảnh kết quả AI đã đánh dấu"></a></figure><div v-else class="annotated-empty">Chưa có ảnh annotate cho lần kiểm tra này.</div></section>
          <section class="ai-result-panel"><h3>Kết quả phân tích</h3><div class="ai-metrics"><div><span>Số lượng AI đếm</span><strong>{{ formatInspectionValue(selectedAiInspection.detectedCount, 0) }} con</strong></div><div><span>Số đếm hiệu chỉnh</span><strong>{{ formatInspectionValue(selectedAiInspection.manualCount, 0) }} con</strong></div><div><span>Mật độ mẫu</span><strong>{{ formatInspectionValue(selectedAiInspection.densityPerMl, 3) }} con/ml</strong></div><div><span>Độ tin cậy</span><strong>{{ selectedAiInspection.averageConfidence == null ? '—' : `${formatInspectionValue(Number(selectedAiInspection.averageConfidence) * 100, 1)}%` }}</strong></div><div><span>Thể tích mẫu</span><strong>{{ formatInspectionValue(selectedAiInspection.sampleVolumeMl, 2) }} ml</strong></div><div><span>Phiên bản model</span><strong>{{ selectedAiInspection.modelVersion || '—' }}</strong></div></div><p v-if="selectedAiInspection.notes" class="ai-inspection-notes">{{ selectedAiInspection.notes }}</p></section>
        </div>
        <section class="ai-history-section"><div class="history-section-heading"><div><h3>Lịch sử kiểm tra AI</h3><p>{{ aiInspections.length }} lần kiểm tra · sắp xếp mới nhất trước</p></div></div><div class="table-wrap"><table class="app-data-table"><thead><tr><th>Thời điểm</th><th class="tabular">Số đếm</th><th class="tabular">Mật độ</th><th>Confidence</th><th>Trạng thái</th><th></th></tr></thead><tbody><tr v-for="inspection in aiInspections" :key="inspection.id" :class="{ 'ai-history-selected': selectedAiInspection.id === inspection.id }"><td>{{ formatTimestamp(inspection.inspectedAt || inspection.createdAt) }}</td><td class="tabular">{{ formatInspectionValue(inspection.detectedCount, 0) }}</td><td class="tabular">{{ inspection.densityPerMl == null ? '—' : `${formatInspectionValue(inspection.densityPerMl, 3)} con/ml` }}</td><td>{{ inspection.averageConfidence == null ? '—' : `${formatInspectionValue(Number(inspection.averageConfidence) * 100, 1)}%` }}</td><td><span class="status-tag" :class="aiInspectionStatusClasses[inspection.status]">{{ aiInspectionStatusNames[inspection.status] || inspection.status }}</span></td><td><v-btn size="small" variant="text" color="primary" @click="selectedAiInspection = inspection">Xem ảnh</v-btn></td></tr></tbody></table></div></section>
      </template>
    </v-card></v-dialog>
</template>

<style scoped>
*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}.detail-subtitle{margin:0;color:#70817e;font-size:13px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 9px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}td{padding:13px 9px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;vertical-align:middle}tbody tr:last-child td{border-bottom:0}td strong,td small{display:block}td strong{color:#214c46;font-size:11px}td small{margin-top:4px;color:#899693;font-size:10px}.status-action{padding:6px 8px;border:1px solid #bfdcd5;border-radius:6px;color:#087f6e;background:white;font-size:10px;cursor:pointer}.status-tag{display:inline-block;padding:5px 8px;border-radius:6px;background:#edf2f0;color:#65736f;font-size:9px;font-weight:750;white-space:nowrap}.status-active{background:#e0f3ed;color:#087f6e}.status-ready_for_sale{background:#fff2d4;color:#8a5a00}.status-sold{background:#e8efff;color:#3357a5}.status-failed,.status-cancelled{background:#fde9e7;color:#a33c34}.dialog-card{padding:26px!important;border-radius:10px!important}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.detail-subtitle{margin-bottom:20px}.notice{padding:18px;border:1px solid #e0e9e6;border-radius:8px;background:#fff;color:#637873}.notice{display:flex;align-items:center;justify-content:space-between;gap:12px}.error-notice{color:#a33c34;border-color:#f0d1ce;background:#fff9f8}
.upload-input{display:block;width:100%;padding:10px;border:1px solid #d6e2df;border-radius:7px;color:#48625e;font:inherit;font-size:12px}.upload-hint{margin-top:5px;color:#7d8c88;font-size:10px}.history-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.history-section-heading h3{margin:0;color:#244b46;font-size:14px}.history-section-heading p,.history-empty{margin:4px 0 0;color:#788984;font-size:11px}
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
@media(max-width:900px){.table-wrap{margin-inline:-8px}th,td{padding-inline:8px}}
@media(max-width:900px){.ai-result-layout{grid-template-columns:1fr}.ai-result-panel{padding:16px 0 0;border-top:1px solid #e5ecea;border-left:0}}
@media(max-width:600px){.dialog-card{padding:18px!important}.ai-upload-fields{grid-template-columns:1fr}.ai-notes-field{grid-column:auto}.ai-media-grid{grid-template-columns:1fr}.ai-result-heading{align-items:flex-start}.ai-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}

</style>
