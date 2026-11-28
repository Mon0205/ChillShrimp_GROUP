<script setup>
import Pagination from '../../../components/pagination/index.vue'
import { computed, ref, watch } from 'vue'
import { useAuth } from '../../../composables/auth.js'
import { canCaptureOnWeb, canUseNativeCamera } from '../../../services/camera.js'
const props = defineProps({ model: { type: Object, required: true } })
const { loading, error, inspectionDialog, aiInspections, selectedAiInspection, inspectionUploading, inspectionSaving, inspectionAnalyzingId, aiInspectionLoading, inspectionBatch, aiInspectionError, inspectionForm, role, formatTimestamp, aiInspectionStatusNames, aiInspectionStatusClasses, formatInspectionValue, inspectionPaging, loadAiInspectionHistory, runAiInspection, uploadInspectionImage, uploadCapturedImage, captureInspectionImage, confirmPendingUpload, discardPendingUpload, saveInspectionImage, saveInspectionReview, deleteAiInspection } = props.model
const auth = useAuth()
// The camera button shows in the Android app and on phone browsers; desktops keep the file picker only.
const nativeCamera = canUseNativeCamera()
const showCameraButton = nativeCamera || canCaptureOnWeb()
const cameraInput = ref(null)
function takePhoto() {
  if (nativeCamera) captureInspectionImage()
  else cameraInput.value?.click()
}
// Mirrors the backend rule: managers in scope, or the person who created the inspection.
const canChange = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER'].includes(role.value) || selectedAiInspection.value?.creator?.id === auth.user?.id)
const canReview = computed(() => selectedAiInspection.value?.status === 'completed' && canChange.value)
// Same rule as the backend (STALE_PROCESSING_MS): still `processing` 10 minutes after the photo was
// saved means the analysis was cut off, so it may be started again.
const STALE_PROCESSING_MS = 10 * 60 * 1000
const isStuck = (inspection) => inspection?.status === 'processing' && inspectionAnalyzingId.value !== inspection.id &&
  Date.now() - new Date(inspection.createdAt).getTime() > STALE_PROCESSING_MS
const canAnalyze = computed(() => ['pending', 'failed'].includes(selectedAiInspection.value?.status) || isStuck(selectedAiInspection.value))
const canDelete = computed(() => ['pending', 'failed'].includes(selectedAiInspection.value?.status) && canChange.value)
const review = ref({ manualCount: '', sampleVolumeMl: '' })
const reviewSaving = ref(false)
watch(() => selectedAiInspection.value && [selectedAiInspection.value.id, selectedAiInspection.value.manualCount, selectedAiInspection.value.sampleVolumeMl], () => {
  review.value = { manualCount: selectedAiInspection.value?.manualCount ?? '', sampleVolumeMl: selectedAiInspection.value?.sampleVolumeMl ?? '' }
}, { immediate: true })
async function saveReview() {
  reviewSaving.value = true
  await saveInspectionReview(selectedAiInspection.value, {
    manualCount: review.value.manualCount === '' ? null : Number(review.value.manualCount),
    sampleVolumeMl: review.value.sampleVolumeMl === '' ? null : Number(review.value.sampleVolumeMl),
  })
  reviewSaving.value = false
}
// Only real problems (level "warning") flag the count; "info" notes do not.
const needsReview = (inspection) => inspection?.status === 'completed' && !!inspection.photoWarnings?.some((warning) => warning.level === 'warning')
const LOW_CONFIDENCE_HINT = 'Phần trăm số con đã đếm mà model nhận ra nhưng chưa chắc chắn (điểm tin cậy dưới 0,4). Đây thường là tôm nằm sát nhau, bị che hoặc ở mép ảnh. Tỉ lệ cao nghĩa là số đếm dễ sai lệch, nên đếm tay kiểm tra lại. Đây không phải sai số của kết quả.'
// Same 50% cut-off as the low_confidence photo warning from the AI service.
const LOW_CONFIDENCE_ALERT = 0.5
// Real error of this photo: only known once a person has confirmed a count.
const countError = (item) => {
  const manual = Number(item.manualCount)
  if (item.manualCount == null || !(manual > 0) || item.detectedCount == null) return null
  return (Number(item.detectedCount) - manual) / manual
}
const countErrorText = (item) => {
  const error = countError(item)
  if (error == null) return ''
  const diff = Math.abs(Number(item.detectedCount) - Number(item.manualCount))
  if (!diff) return 'Chính xác (0%)'
  return `${formatInspectionValue(Math.abs(error) * 100, 1)}% (AI đếm ${error < 0 ? 'thiếu' : 'dư'} ${formatInspectionValue(diff, 0)} con)`
}
const lowConfidenceText = (item) => {
  if (item.lowConfidenceRatio == null) return '—'
  const low = Math.round(Number(item.lowConfidenceRatio) * Number(item.detectedCount))
  return `${formatInspectionValue(Number(item.lowConfidenceRatio) * 100, 1)}% (${formatInspectionValue(low, 0)}/${formatInspectionValue(item.detectedCount, 0)} con)`
}
const CONFIDENCE_HINT = 'Cách tính: model chấm điểm từ 0 đến 100% cho từng khung xanh (mức chắc đó là một con tôm), rồi lấy trung bình cộng của tất cả khung. Chỉ các khung đạt ngưỡng lọc (mặc định 35%) được tính, nên giá trị này không thể thấp hơn ngưỡng đó. Đây không phải độ chính xác của số đếm: tôm bị bỏ sót không có khung nên không được tính vào.'
</script>

<template>
<v-dialog v-model="inspectionDialog" max-width="1040" scrollable><v-card class="dialog-card ai-dialog"><v-btn class="form-dialog-close" type="button" icon="mdi-close" size="small" variant="text" aria-label="Đóng form" :disabled="inspectionUploading || inspectionSaving" @click="inspectionDialog = false" /><span class="eyebrow">MEDIA MANAGEMENT · AI INSPECTION</span><h2>Kiểm tra mẫu bằng AI</h2><p class="detail-subtitle">{{ inspectionBatch?.batchCode }} · {{ inspectionBatch?.tank?.name || inspectionBatch?.tank?.code }}</p>
      <section class="ai-upload-area"><div><h3>Tải ảnh kiểm tra</h3><p>Ảnh sẽ được lưu cùng hồ sơ lô giống. Ảnh annotate và kết quả sẽ hiển thị khi AI trả dữ liệu.</p></div><div class="ai-upload-fields">
        <div><label>Ảnh mẫu *</label><template v-if="showCameraButton"><v-btn class="mb-2" color="primary" prepend-icon="mdi-camera" block :loading="inspectionUploading" :disabled="inspectionSaving" @click="takePhoto">Chụp ảnh</v-btn><input ref="cameraInput" type="file" accept="image/*" capture="environment" hidden @change="uploadCapturedImage"></template><input class="upload-input" type="file" accept="image/jpeg,image/png,image/webp" :disabled="inspectionUploading || inspectionSaving" @change="uploadInspectionImage"><div class="upload-hint">JPG, PNG hoặc WEBP · tối đa 10 MB · kiểm tra độ nét, độ sáng, độ phân giải trước khi tải lên</div></div>
        <div><label>Thể tích mẫu (ml)</label><v-text-field v-model="inspectionForm.sampleVolumeMl" type="number" min="0.001" max="1000000" step="any" hide-details="auto" /></div>
        <div class="ai-notes-field"><label>Ghi chú</label><v-textarea v-model="inspectionForm.notes" maxlength="4000" rows="2" auto-grow hide-details="auto" /></div>
      </div>
      <div v-if="inspectionForm.precheckWarnings?.length" class="ai-precheck" role="status">
        <p class="ai-precheck-title">{{ inspectionForm.pendingFile ? `Ảnh “${inspectionForm.filename}” có vấn đề, nên chụp lại trước khi tải lên:` : 'Lưu ý về ảnh vừa tải lên:' }}</p>
        <ul class="ai-warnings">
          <li v-for="warning in inspectionForm.precheckWarnings" :key="warning.code" :class="`ai-warning-${warning.level}`"><v-icon :icon="warning.level === 'warning' ? 'mdi-alert-outline' : 'mdi-information-outline'" size="16" /><span>{{ warning.message }}</span></li>
        </ul>
        <div v-if="inspectionForm.pendingFile" class="ai-precheck-actions"><v-btn variant="text" :disabled="inspectionUploading" @click="discardPendingUpload">Chọn ảnh khác</v-btn><v-btn variant="outlined" color="warning" :loading="inspectionUploading" @click="confirmPendingUpload">Vẫn dùng ảnh này</v-btn></div>
      </div>
      <div v-if="inspectionForm.previewUrl" class="ai-upload-preview"><img :src="inspectionForm.previewUrl" :alt="`Ảnh mẫu đã tải lên: ${inspectionForm.filename}`"><span>{{ inspectionForm.filename }}</span></div>
      <div class="dialog-actions"><v-btn variant="text" :disabled="inspectionUploading || inspectionSaving" @click="inspectionDialog = false">Đóng</v-btn><v-btn color="primary" :loading="inspectionSaving" :disabled="inspectionUploading || !inspectionForm.mediaPublicId" @click="saveInspectionImage">Lưu ảnh kiểm tra</v-btn></div></section>

      <v-progress-linear v-if="aiInspectionLoading" indeterminate color="primary" />
      <div v-else-if="aiInspectionError" class="notice error-notice" role="alert"><span>{{ aiInspectionError }}</span><v-btn size="small" variant="text" @click="loadAiInspectionHistory(inspectionBatch)">Thử lại</v-btn></div>
      <p v-else-if="!aiInspections.length" class="history-empty">Chưa có lịch sử kiểm tra AI cho lô này.</p>
      <template v-else-if="selectedAiInspection">
        <div class="ai-result-heading"><div><span class="eyebrow">KẾT QUẢ ĐANG XEM</span><p>{{ formatTimestamp(selectedAiInspection.inspectedAt || selectedAiInspection.createdAt) }} · {{ selectedAiInspection.creator?.displayName || 'Người dùng' }}</p></div><div class="ai-result-actions"><span class="status-tag" :class="aiInspectionStatusClasses[selectedAiInspection.status]"><v-icon v-if="needsReview(selectedAiInspection)" icon="mdi-alert-outline" size="12" class="status-icon" />{{ aiInspectionStatusNames[selectedAiInspection.status] || selectedAiInspection.status }}</span><v-btn v-if="canAnalyze" size="small" variant="outlined" color="primary" :disabled="!!inspectionAnalyzingId" @click="runAiInspection(selectedAiInspection)">{{ selectedAiInspection.status === 'pending' ? 'Phân tích AI' : 'Phân tích lại' }}</v-btn><v-btn v-if="canDelete" size="small" variant="text" color="error" prepend-icon="mdi-delete-outline" :disabled="!!inspectionAnalyzingId" @click="deleteAiInspection(selectedAiInspection)">Xóa</v-btn></div></div>
        <v-progress-linear v-if="inspectionAnalyzingId === selectedAiInspection.id" indeterminate color="primary" class="ai-analysis-progress" />
        <div class="ai-result-layout"><section class="ai-media-grid"><figure><figcaption>Ảnh gốc</figcaption><a :href="selectedAiInspection.mediaUrl" target="_blank" rel="noopener noreferrer"><img :src="selectedAiInspection.mediaUrl" alt="Ảnh gốc của lần kiểm tra"></a></figure><figure v-if="selectedAiInspection.annotatedImageUrl"><figcaption>Ảnh đã đánh dấu kết quả AI</figcaption><a :href="selectedAiInspection.annotatedImageUrl" target="_blank" rel="noopener noreferrer"><img :src="selectedAiInspection.annotatedImageUrl" alt="Ảnh kết quả AI đã đánh dấu"></a></figure><div v-else class="annotated-empty">Chưa có ảnh annotate cho lần kiểm tra này.</div></section>
          <section class="ai-result-panel"><h3>Kết quả phân tích</h3><div class="ai-metrics">
              <div><span>Số lượng AI đếm</span><strong>{{ formatInspectionValue(selectedAiInspection.detectedCount, 0) }} con</strong><span v-if="needsReview(selectedAiInspection)" class="review-tag"><v-icon icon="mdi-alert-outline" size="12" />Cần kiểm tra lại</span></div>
              <div v-if="selectedAiInspection.manualCount != null"><span>Số đếm xác nhận</span><strong>{{ formatInspectionValue(selectedAiInspection.manualCount, 0) }} con</strong></div>
              <div v-if="countErrorText(selectedAiInspection)"><span class="metric-label">Sai số so với đếm tay<v-tooltip text="Sai số thật của ảnh này: |AI đếm − số đếm xác nhận| chia số đếm xác nhận. Chỉ tính được khi đã nhập số đếm tay." location="top" max-width="340"><template #activator="{ props: tip }"><v-icon v-bind="tip" icon="mdi-information-outline" size="13" tabindex="0" aria-label="Cách tính sai số" /></template></v-tooltip></span><strong>{{ countErrorText(selectedAiInspection) }}</strong></div>
              <div><span class="metric-label">Mức chắc chắn của model<v-tooltip :text="CONFIDENCE_HINT" location="top" max-width="340"><template #activator="{ props: tip }"><v-icon v-bind="tip" icon="mdi-information-outline" size="13" tabindex="0" :aria-label="CONFIDENCE_HINT" /></template></v-tooltip></span><strong>{{ selectedAiInspection.averageConfidence == null ? '—' : `${formatInspectionValue(Number(selectedAiInspection.averageConfidence) * 100, 1)}%` }}</strong></div>
              <div><span class="metric-label">Khung chưa chắc chắn<v-tooltip :text="LOW_CONFIDENCE_HINT" location="top" max-width="340"><template #activator="{ props: tip }"><v-icon v-bind="tip" icon="mdi-information-outline" size="13" tabindex="0" :aria-label="LOW_CONFIDENCE_HINT" /></template></v-tooltip></span><strong :class="{ 'metric-alert': selectedAiInspection.lowConfidenceRatio > LOW_CONFIDENCE_ALERT }">{{ lowConfidenceText(selectedAiInspection) }}</strong></div>
              <div><span>Phiên bản model</span><strong>{{ selectedAiInspection.modelVersion || '—' }}</strong></div>
              <template v-if="selectedAiInspection.sampleVolumeMl != null">
                <div><span>Thể tích mẫu</span><strong>{{ formatInspectionValue(selectedAiInspection.sampleVolumeMl, 2) }} ml</strong></div>
                <div><span>Mật độ mẫu</span><strong>{{ formatInspectionValue(selectedAiInspection.densityPerMl, 3) }} con/ml</strong></div>
              </template>
              <p v-else class="metric-note">Chưa nhập thể tích mẫu nên không tính được mật độ.</p>
            </div>
            <form v-if="canReview" class="ai-review" @submit.prevent="saveReview">
              <p class="ai-review-title">Xác nhận kết quả</p>
              <div class="ai-review-fields">
                <v-text-field v-model="review.manualCount" label="Số đếm xác nhận (con)" type="number" min="0" step="1" density="compact" variant="outlined" hide-details />
                <v-text-field v-model="review.sampleVolumeMl" label="Thể tích mẫu (ml)" type="number" min="0.001" step="any" density="compact" variant="outlined" hide-details />
              </div>
              <div class="ai-review-actions"><span>Số AI đếm được giữ nguyên để đối chiếu.</span><v-btn type="submit" size="small" color="primary" variant="tonal" :loading="reviewSaving">Lưu</v-btn></div>
            </form>
            <div v-if="selectedAiInspection.status === 'completed'" class="ai-quality" aria-live="polite">
              <p class="ai-disclaimer">Kết quả AI chỉ hỗ trợ đánh giá: đây là số đếm trong ảnh mẫu, không phải số lượng cả lô.</p>
              <ul v-if="selectedAiInspection.photoWarnings?.length" class="ai-warnings">
                <li v-for="warning in selectedAiInspection.photoWarnings" :key="warning.code" :class="`ai-warning-${warning.level}`"><v-icon :icon="warning.level === 'warning' ? 'mdi-alert-outline' : 'mdi-information-outline'" size="16" /><span>{{ warning.message }}</span></li>
              </ul>
              <p v-else-if="Array.isArray(selectedAiInspection.photoWarnings)" class="ai-quality-ok"><v-icon icon="mdi-check-circle-outline" size="16" /><span>Không phát hiện vấn đề về chất lượng ảnh.</span></p>
            </div>
            <p v-if="selectedAiInspection.notes" class="ai-inspection-notes">{{ selectedAiInspection.notes }}</p></section>
        </div>
        <section class="ai-history-section"><div class="history-section-heading"><div><h3>Lịch sử kiểm tra AI</h3><p>{{ inspectionPaging.total }} lần kiểm tra · sắp xếp mới nhất trước</p></div></div><div class="table-wrap"><table class="app-data-table"><thead><tr><th>Thời điểm</th><th class="tabular">Số đếm</th><th class="tabular">Mật độ</th><th>Mức chắc chắn của model</th><th>Cảnh báo ảnh</th><th>Trạng thái</th><th></th></tr></thead><tbody><tr v-for="inspection in aiInspections" :key="inspection.id" :class="{ 'ai-history-selected': selectedAiInspection.id === inspection.id }"><td>{{ formatTimestamp(inspection.inspectedAt || inspection.createdAt) }}</td><td class="tabular">{{ formatInspectionValue(inspection.detectedCount, 0) }}</td><td class="tabular">{{ inspection.densityPerMl == null ? '—' : `${formatInspectionValue(inspection.densityPerMl, 3)} con/ml` }}</td><td>{{ inspection.averageConfidence == null ? '—' : `${formatInspectionValue(Number(inspection.averageConfidence) * 100, 1)}%` }}</td><td><span v-if="inspection.photoWarnings?.some((warning) => warning.level === 'warning')" class="status-tag status-warning">{{ inspection.photoWarnings.filter((warning) => warning.level === 'warning').length }} cảnh báo</span><span v-else-if="Array.isArray(inspection.photoWarnings)" class="status-tag">Không</span><span v-else>—</span></td><td><span class="status-tag" :class="aiInspectionStatusClasses[inspection.status]">{{ aiInspectionStatusNames[inspection.status] || inspection.status }}</span></td><td><v-btn size="small" variant="text" color="primary" @click="selectedAiInspection = inspection">Xem ảnh</v-btn></td></tr></tbody></table>
</div>
        <Pagination v-if="inspectionPaging.total > 10" :page="inspectionPaging.page" :page-size="inspectionPaging.size" :total="inspectionPaging.total" :loading="aiInspectionLoading" @update:page="loadAiInspectionHistory(inspectionBatch, $event, inspectionPaging.size)" @update:page-size="loadAiInspectionHistory(inspectionBatch, 1, $event)" /></section>
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
.ai-upload-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px;align-items:start}
.ai-upload-fields>div{min-width:0}
.ai-upload-fields label{display:block;margin-bottom:6px;color:#48625e;font-size:11px;font-weight:700}
.ai-notes-field{grid-column:1/-1}
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
.ai-review{margin-top:14px;padding-top:12px;border-top:1px solid #e5ecea}
.ai-review-title{margin:0 0 8px;color:#244b46;font-size:12px;font-weight:700}
.ai-review-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ai-review-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;color:#788984;font-size:10px}
.metric-alert{color:#c2570c}
.metric-label{display:flex!important;align-items:center;gap:4px}
.metric-label .v-icon{color:#7d8c88;cursor:help}
.review-tag{display:inline-flex!important;align-items:center;gap:3px;margin-top:6px;padding:3px 7px;border-radius:6px;background:#fff2d4;color:#8a5a00;font-size:10px!important;font-weight:700}
.metric-note{grid-column:1 / -1;margin:0;padding:8px 10px;border-radius:7px;background:#f4f7f6;color:#657873;font-size:11px;line-height:1.45}
.status-icon{margin-right:3px;vertical-align:-1px}
.ai-precheck{margin-top:14px}
.ai-precheck-title{margin:0 0 8px;color:#48625e;font-size:11px;font-weight:700}
.ai-precheck-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
.ai-quality{margin-top:14px;padding-top:12px;border-top:1px solid #e5ecea}
.ai-disclaimer{margin:0 0 10px;color:#657873;font-size:11px;line-height:1.5}
.ai-warnings{display:grid;gap:6px;margin:0;padding:0;list-style:none}
.ai-warnings li,.ai-quality-ok{display:flex;align-items:flex-start;gap:7px;margin:0;padding:8px 10px;border-radius:7px;font-size:11px;line-height:1.45}
.ai-warnings .v-icon,.ai-quality-ok .v-icon{flex:none;margin-top:1px}
.ai-warning-warning{background:#fff4e0;color:#7a4b00}
.ai-warning-info{background:#eef4fb;color:#33557a}
.ai-quality-ok{background:#e9f6f1;color:#0b6b5c}
.status-warning{background:#fff2d4;color:#8a5a00}
.ai-history-section{padding-top:18px;margin-top:18px;border-top:1px solid #e5ecea}
.ai-history-selected{background:#eef8f5}
.ai-history-section tbody tr{cursor:pointer}
.ai-history-section tbody tr:hover{background:#f3faf8}
.tabular{font-variant-numeric:tabular-nums;white-space:nowrap}
@media(max-width:900px){.table-wrap{margin-inline:-8px}th,td{padding-inline:8px}}
@media(max-width:900px){.ai-result-layout{grid-template-columns:1fr}.ai-result-panel{padding:16px 0 0;border-top:1px solid #e5ecea;border-left:0}}
@media(max-width:600px){.dialog-card{padding:18px!important}.ai-upload-fields{grid-template-columns:1fr}.ai-notes-field{grid-column:auto}.ai-media-grid{grid-template-columns:1fr}.ai-result-heading{align-items:flex-start}.ai-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}

</style>
