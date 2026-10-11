<script setup>
const props = defineProps({ model: { type: Object, required: true } })
const { loading, qualityDialog, qualitySaving, qualityUploading, qualityBatch, qualityForm, form, checkTypeOptions, diseaseOptions, resultOptions, uploadQualityEvidence, saveQualityCheck } = props.model
</script>

<template>
<v-dialog v-model="qualityDialog" max-width="760" scrollable><v-card class="dialog-card"><span class="eyebrow">UC05.1.3 · TECHNICIAN</span><h2>Ghi kiểm tra chất lượng</h2><p class="detail-subtitle">{{ qualityBatch?.batchCode }} · {{ qualityBatch?.tank?.name || qualityBatch?.tank?.code }}</p>
      <div class="form-grid">
        <div><label>Loại kiểm tra *</label><v-select v-model="qualityForm.checkType" :items="checkTypeOptions" hide-details="auto" /></div>
        <div><label>Cỡ mẫu (con) *</label><v-text-field v-model.number="qualityForm.sampleSize" type="number" min="1" step="1" hide-details="auto" /></div>
        <div v-if="['salinity_stress','formalin_stress'].includes(qualityForm.checkType)"><label>Số cá thể sống *</label><v-text-field v-model.number="qualityForm.liveCount" type="number" min="0" :max="qualityForm.sampleSize" hide-details="auto" /></div>
        <div><label>Số cá thể bất thường</label><v-text-field v-model.number="qualityForm.abnormalCount" type="number" min="0" :max="qualityForm.sampleSize" hide-details="auto" /></div>
        <div v-if="qualityForm.checkType === 'pcr'"><label>Tác nhân PCR *</label><v-select v-model="qualityForm.diseaseCode" :items="diseaseOptions" hide-details="auto" /></div>
        <div><label>Phương pháp *</label><v-text-field v-model="qualityForm.testMethod" maxlength="100" placeholder="SOP/mã phương pháp" hide-details="auto" /></div>
        <div><label>Kết luận *</label><v-select v-model="qualityForm.result" :items="resultOptions" hide-details="auto" /></div>
        <div><label>Phòng xét nghiệm</label><v-text-field v-model="qualityForm.labName" maxlength="150" hide-details="auto" /></div>
        <div class="span-2"><label>Ảnh mẫu hoặc phiếu xét nghiệm</label><input class="upload-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" :disabled="qualityUploading" @change="uploadQualityEvidence"><div class="upload-hint">JPG, PNG, WEBP hoặc PDF · tối đa 10 MB</div><div v-if="qualityForm.evidenceName" class="uploaded-file"><span>{{ qualityForm.evidenceName }}</span><button type="button" :disabled="qualityUploading" @click="Object.assign(qualityForm, { evidencePublicId: '', evidenceResourceType: '', evidenceFormat: '', evidencePreviewUrl: '', evidenceName: '' })">Gỡ tệp</button></div><img v-if="qualityForm.evidencePreviewUrl && qualityForm.evidenceFormat !== 'pdf'" class="media-preview" :src="qualityForm.evidencePreviewUrl" alt="Xem trước minh chứng"><iframe v-else-if="qualityForm.evidencePreviewUrl" class="document-preview" :src="qualityForm.evidencePreviewUrl" title="Xem trước tài liệu minh chứng" /></div>
        <div class="span-2"><label>Ghi chú</label><v-textarea v-model="qualityForm.notes" maxlength="4000" rows="2" auto-grow hide-details="auto" /></div>
      </div>
      <div class="dialog-actions"><v-btn variant="text" @click="qualityDialog = false">Hủy</v-btn><v-btn color="primary" :loading="qualitySaving" :disabled="qualityUploading" @click="saveQualityCheck">Lưu kết quả</v-btn></div>
    </v-card></v-dialog>
</template>

<style scoped>
*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}.detail-subtitle{margin:0;color:#70817e;font-size:13px}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 9px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}td{padding:13px 9px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;vertical-align:middle}tbody tr:last-child td{border-bottom:0}td strong,td small{display:block}td strong{color:#214c46;font-size:11px}td small{margin-top:4px;color:#899693;font-size:10px}.status-action{padding:6px 8px;border:1px solid #bfdcd5;border-radius:6px;color:#087f6e;background:white;font-size:10px;cursor:pointer}.status-tag{display:inline-block;padding:5px 8px;border-radius:6px;background:#edf2f0;color:#65736f;font-size:9px;font-weight:750;white-space:nowrap}.status-active{background:#e0f3ed;color:#087f6e}.status-ready_for_sale{background:#fff2d4;color:#8a5a00}.status-sold{background:#e8efff;color:#3357a5}.status-failed,.status-cancelled{background:#fde9e7;color:#a33c34}.dialog-card{padding:26px!important;border-radius:10px!important}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px}.span-2{grid-column:span 2}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.detail-subtitle{margin-bottom:20px}
.upload-input{display:block;width:100%;padding:10px;border:1px solid #d6e2df;border-radius:7px;color:#48625e;font:inherit;font-size:12px}.upload-hint{margin-top:5px;color:#7d8c88;font-size:10px}.uploaded-file{display:flex;justify-content:space-between;gap:10px;margin-top:8px;color:#214c46;font-size:12px}.uploaded-file button{border:0;color:#a33c34;background:transparent;cursor:pointer}
.media-preview{display:block;max-width:100%;max-height:280px;margin-top:10px;border:1px solid #dce7e4;border-radius:7px;object-fit:contain}.document-preview{display:block;width:100%;height:320px;margin-top:10px;border:1px solid #dce7e4;border-radius:7px;background:#f7faf9}
.status-processing{background:#e7f0ff;color:#315fa8}
@media(max-width:900px){th,td{padding-inline:8px}}
@media(max-width:600px){.form-grid{grid-template-columns:1fr}.span-2{grid-column:auto}.dialog-card{padding:18px!important}}

</style>
