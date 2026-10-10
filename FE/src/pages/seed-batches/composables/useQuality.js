import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'
import { uploadCloudinaryFile } from '../../../services/cloudinary.js'

export function useQuality({ error, qualityDialog, qualityHistoryDialog, reviewDialog, qualityChecks, qualityLoading, qualitySaving, qualityUploading, reviewSaving, selectedCheck, qualityBatch, reviewForm, qualityForm, emptyQualityForm, qualityUrl }) {
  async function openQualityHistory(batch) {
    qualityBatch.value = batch
    qualityHistoryDialog.value = true
    qualityLoading.value = true
    qualityChecks.value = []
    try {
      qualityChecks.value = (await api(qualityUrl(batch.id))).data.items
    } catch (err) {
      qualityHistoryDialog.value = false
      showToast(err.message, 'error')
    } finally {
      qualityLoading.value = false
    }
  }

  function openQualityForm(batch) {
    qualityBatch.value = batch
    qualityForm.value = emptyQualityForm()
    qualityDialog.value = true
  }

  async function uploadQualityEvidence(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    qualityUploading.value = true
    try {
      const uploaded = await uploadCloudinaryFile(`${qualityUrl(qualityBatch.value.id)}/upload-signature`, file)
      qualityForm.value.evidencePublicId = uploaded.publicId
      qualityForm.value.evidenceResourceType = uploaded.resourceType
      qualityForm.value.evidenceFormat = uploaded.format
      qualityForm.value.evidencePreviewUrl = uploaded.secureUrl
      qualityForm.value.evidenceName = file.name
      showToast('Đã tải minh chứng lên Cloudinary.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      qualityUploading.value = false
    }
  }

  async function saveQualityCheck() {
    const f = qualityForm.value
    const sampleSize = Number(f.sampleSize)
    const liveCount = f.liveCount === '' ? null : Number(f.liveCount)
    const abnormalCount = f.abnormalCount === '' ? null : Number(f.abnormalCount)
    if (!Number.isSafeInteger(sampleSize) || sampleSize < 1) return showToast('Cỡ mẫu phải là số nguyên lớn hơn 0.', 'error')
    if (['salinity_stress', 'formalin_stress'].includes(f.checkType) && liveCount === null) return showToast('Nhập số cá thể sống cho phép thử stress.', 'error')
    if ([liveCount, abnormalCount].some((value) => value !== null && (!Number.isSafeInteger(value) || value < 0 || value > sampleSize))) return showToast('Số lượng phải là số nguyên từ 0 đến cỡ mẫu.', 'error')
    if (!f.testMethod.trim()) return showToast('Phương pháp kiểm tra là bắt buộc.', 'error')
    if (f.checkType === 'pcr' && !f.diseaseCode) return showToast('Chọn tác nhân cần xét nghiệm PCR.', 'error')
    qualitySaving.value = true
    try {
      const payload = {
        checkType: f.checkType, diseaseCode: f.diseaseCode || null, sampleSize, liveCount, abnormalCount,
        testMethod: f.testMethod.trim(), labName: f.labName.trim() || null,
        ...(f.evidencePublicId ? { evidencePublicId: f.evidencePublicId, evidenceResourceType: f.evidenceResourceType } : {}),
        result: f.result, notes: f.notes.trim() || null,
      }
      await api(qualityUrl(qualityBatch.value.id), { method: 'POST', body: JSON.stringify(payload) })
      qualityDialog.value = false
      showToast('Đã lưu kết quả kiểm tra chất lượng.', 'success')
      await openQualityHistory(qualityBatch.value)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      qualitySaving.value = false
    }
  }

  function openReview(check, reviewStatus) {
    selectedCheck.value = check
    reviewForm.value = { reviewStatus, reviewNotes: '' }
    reviewDialog.value = true
  }

  async function saveReview() {
    if (!selectedCheck.value || !qualityBatch.value) return
    if (['action_required', 'resolved'].includes(reviewForm.value.reviewStatus) && !reviewForm.value.reviewNotes.trim()) return showToast('Ghi rõ hướng xử lý hoặc kết quả xử lý.', 'error')
    reviewSaving.value = true
    try {
      await api(`${qualityUrl(qualityBatch.value.id)}/${selectedCheck.value.id}/review`, { method: 'PATCH', body: JSON.stringify(reviewForm.value) })
      reviewDialog.value = false
      showToast('Đã cập nhật trạng thái duyệt.', 'success')
      await openQualityHistory(qualityBatch.value)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      reviewSaving.value = false
    }
  }

  return { openQualityHistory, openQualityForm, uploadQualityEvidence, saveQualityCheck, openReview, saveReview }
}
