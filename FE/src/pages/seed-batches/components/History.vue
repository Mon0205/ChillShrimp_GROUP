<script setup>
const props = defineProps({ model: { type: Object, required: true } })
const { qualityHistoryDialog, qualityChecks, qualityLoading, qualityBatch, canManage, checkTypeOptions, resultNames, reviewNames, formatDate, openReview } = props.model
</script>

<template>
<v-dialog v-model="qualityHistoryDialog" max-width="900" scrollable><v-card class="dialog-card"><span class="eyebrow">LỊCH SỬ KIỂM TRA</span><h2>{{ qualityBatch?.batchCode }}</h2>
      <v-progress-linear v-if="qualityLoading" indeterminate color="primary" />
      <p v-else-if="!qualityChecks.length" class="detail-subtitle">Chưa có lần kiểm tra chất lượng nào.</p>
      <div v-else class="quality-history"><article v-for="check in qualityChecks" :key="check.id" class="quality-entry">
        <div class="quality-entry-head"><strong>{{ checkTypeOptions.find((option) => option.value === check.checkType)?.title || check.checkType }}</strong><span class="status-tag" :class="`status-${check.result}`">{{ resultNames[check.result] || check.result }}</span><span class="status-tag">{{ reviewNames[check.reviewStatus] || check.reviewStatus }}</span></div>
        <p>Cỡ mẫu {{ check.sampleSize }} · Sống {{ check.liveCount ?? '—' }}<template v-if="check.survivalRate !== null"> ({{ check.survivalRate }}%)</template> · Bất thường {{ check.abnormalCount ?? '—' }}<template v-if="check.deformityRate !== null"> ({{ check.deformityRate }}%)</template></p>
        <p>{{ check.diseaseCode ? `PCR: ${check.diseaseCode} · ` : '' }}{{ check.testMethod }}<template v-if="check.labName"> · {{ check.labName }}</template> · {{ formatDate(check.checkedAt) }}</p>
        <p v-if="check.notes">{{ check.notes }}</p><p v-if="check.reviewNotes" class="review-note">Xử lý: {{ check.reviewNotes }}</p>
        <div v-if="check.evidenceUrl" class="evidence-preview"><img v-if="check.evidenceFormat && check.evidenceFormat !== 'pdf'" class="media-preview" :src="check.evidenceUrl" alt="Ảnh minh chứng kiểm tra chất lượng"><iframe v-else-if="check.evidenceFormat === 'pdf'" class="document-preview" :src="check.evidenceUrl" title="Phiếu kiểm nghiệm PDF" /><a :href="check.evidenceUrl" target="_blank" rel="noopener noreferrer">Mở hồ sơ minh chứng</a></div>
        <div v-if="canManage && check.reviewStatus === 'pending'" class="quality-actions"><v-btn size="small" variant="outlined" color="primary" @click="openReview(check, 'confirmed')">Xác nhận</v-btn><v-btn size="small" variant="outlined" color="warning" @click="openReview(check, 'action_required')">Yêu cầu xử lý</v-btn></div>
        <div v-else-if="canManage && check.reviewStatus === 'action_required'" class="quality-actions"><v-btn size="small" variant="outlined" color="primary" @click="openReview(check, 'resolved')">Đánh dấu đã xử lý</v-btn></div>
      </article></div>
      <div class="dialog-actions"><v-btn variant="text" @click="qualityHistoryDialog = false">Đóng</v-btn></div>
    </v-card></v-dialog>
</template>

<style scoped>
*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}.detail-subtitle{margin:0;color:#70817e;font-size:13px}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 9px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}td{padding:13px 9px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;vertical-align:middle}tbody tr:last-child td{border-bottom:0}td strong,td small{display:block}td strong{color:#214c46;font-size:11px}td small{margin-top:4px;color:#899693;font-size:10px}.status-action{padding:6px 8px;border:1px solid #bfdcd5;border-radius:6px;color:#087f6e;background:white;font-size:10px;cursor:pointer}.status-tag{display:inline-block;padding:5px 8px;border-radius:6px;background:#edf2f0;color:#65736f;font-size:9px;font-weight:750;white-space:nowrap}.status-active{background:#e0f3ed;color:#087f6e}.status-ready_for_sale{background:#fff2d4;color:#8a5a00}.status-sold{background:#e8efff;color:#3357a5}.status-failed,.status-cancelled{background:#fde9e7;color:#a33c34}.dialog-card{padding:26px!important;border-radius:10px!important}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.detail-subtitle{margin-bottom:20px}
.quality-history{display:grid;gap:10px;margin-top:14px}.quality-entry{padding:14px;border:1px solid #e1eae7;border-radius:8px}.quality-entry-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.quality-entry-head strong{margin-right:auto;color:#214c46;font-size:13px}.quality-entry p{margin:9px 0 0;color:#657873;font-size:12px}.quality-entry a{display:inline-block;margin-top:8px;color:#087f6e;font-size:12px}.review-note{color:#8a5a00!important}.quality-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.media-preview{display:block;max-width:100%;max-height:280px;margin-top:10px;border:1px solid #dce7e4;border-radius:7px;object-fit:contain}.document-preview{display:block;width:100%;height:320px;margin-top:10px;border:1px solid #dce7e4;border-radius:7px;background:#f7faf9}.evidence-preview{display:grid;gap:8px;margin-top:8px}.evidence-preview a{width:max-content;color:#087f6e;font-size:11px}
.status-processing{background:#e7f0ff;color:#315fa8}
@media(max-width:900px){th,td{padding-inline:8px}}
@media(max-width:600px){.dialog-card{padding:18px!important}}

</style>
