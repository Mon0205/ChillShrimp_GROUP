import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'
import { uploadCloudinaryFile } from '../../../services/cloudinary.js'
import { checkPhotoFile } from '../../../utils/photo-precheck.js'
import { capturePhoto, resizePhoto } from '../../../services/camera.js'

// 0 = network error (no HTTP answer); 409 = another request is already analysing this inspection.
const RETRYABLE_STATUSES = [0, 409, 502, 503, 504]
const POLL_INTERVAL_MS = 5000
const ANALYSIS_WAIT_MS = 4 * 60 * 1000

export function useBatchInspection({ error, inspectionDialog, aiInspections, selectedAiInspection, inspectionUploading, inspectionSaving, inspectionAnalyzingId, aiInspectionLoading, inspectionBatch, aiInspectionError, inspectionForm, form, emptyInspectionForm, inspectionUrl, formatInspectionValue }) {
  function openInspectionUpload(batch) {
    inspectionBatch.value = batch
    inspectionForm.value = emptyInspectionForm()
    aiInspections.value = []
    selectedAiInspection.value = null
    aiInspectionError.value = ''
    inspectionDialog.value = true
    return loadAiInspectionHistory(batch)
  }

  async function loadAiInspectionHistory(batch) {
    aiInspectionLoading.value = true
    try {
      const response = await api(`${inspectionUrl(batch.id)}?limit=100`)
      aiInspections.value = response.data.items
      selectedAiInspection.value = aiInspections.value.find((item) => item.id === selectedAiInspection.value?.id) || aiInspections.value[0] || null
      aiInspectionError.value = ''
    } catch (err) {
      aiInspectionError.value = err.message
    } finally {
      aiInspectionLoading.value = false
    }
  }

  async function runAiInspection(inspection) {
    if (!inspectionBatch.value || inspectionAnalyzingId.value) return
    const batchId = inspectionBatch.value.id
    inspectionAnalyzingId.value = inspection.id
    aiInspections.value = aiInspections.value.map((item) => item.id === inspection.id ? { ...item, status: 'processing' } : item)
    if (selectedAiInspection.value?.id === inspection.id) selectedAiInspection.value = { ...selectedAiInspection.value, status: 'processing' }
    try {
      const response = await api(`${inspectionUrl(batchId)}/${inspection.id}/analyze`, { method: 'POST' })
      showAnalysisResult(batchId, response.data)
    } catch (err) {
      // A sleeping AI service can make the request outlive the Vercel proxy (502/504) while the
      // backend keeps analysing and saves the result; wait for that result before reporting an error.
      const finished = RETRYABLE_STATUSES.includes(err.status ?? 0)
        ? await waitForAnalysis(batchId, inspection.id).catch(() => null)
        : null
      if (finished?.status === 'completed') {
        showAnalysisResult(batchId, finished)
      } else {
        if (inspectionBatch.value?.id === batchId) await loadAiInspectionHistory(inspectionBatch.value)
        showToast(err.message, 'error')
      }
    } finally {
      inspectionAnalyzingId.value = null
    }
  }

  function showAnalysisResult(batchId, result) {
    if (inspectionBatch.value?.id === batchId) {
      aiInspections.value = aiInspections.value.map((item) => item.id === result.id ? result : item)
      if (selectedAiInspection.value?.id === result.id) selectedAiInspection.value = result
    }
    const countText = formatInspectionValue(result.detectedCount, 0)
    const photoIssues = (result.photoWarnings || []).filter((warning) => warning.level === 'warning').length
    if (photoIssues) {
      showToast(`AI đã đếm được ${countText} con nhưng ảnh có ${photoIssues} cảnh báo chất lượng, kết quả có thể sai. Hãy xem cảnh báo và điền "Số đếm xác nhận" sau khi đếm tay.`, 'warning')
    } else {
      showToast(`AI đã đếm được ${countText} con trong ảnh mẫu.`, 'success')
    }
  }

  // Polls the history until the inspection leaves `processing`; returns it, or null on timeout.
  async function waitForAnalysis(batchId, inspectionId) {
    const deadline = Date.now() + ANALYSIS_WAIT_MS
    let announced = false
    for (;;) {
      const response = await api(`${inspectionUrl(batchId)}?limit=100`)
      const item = response.data.items.find((entry) => entry.id === inspectionId)
      if (!item || item.status !== 'processing') return item || null
      if (Date.now() + POLL_INTERVAL_MS > deadline) return null
      if (!announced) {
        showToast('AI đang khởi động sau thời gian nghỉ, kết quả sẽ có trong khoảng 1-2 phút.', 'info')
        announced = true
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }

  async function uploadPhoto(file) {
    inspectionUploading.value = true
    try {
      const uploaded = await uploadCloudinaryFile(`${inspectionUrl(inspectionBatch.value.id)}/upload-signature`, file, { imagesOnly: true })
      Object.assign(inspectionForm.value, {
        mediaPublicId: uploaded.publicId,
        previewUrl: uploaded.secureUrl,
        filename: file.name,
        pendingFile: null,
      })
      showToast('Ảnh kiểm tra đã được tải lên Cloudinary.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      inspectionUploading.value = false
    }
  }

  async function uploadInspectionImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) await handleInspectionFile(file)
  }

  // Phone browser: <input capture> returns a full-size camera photo; shrink it like the app does.
  async function uploadCapturedImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    let photo
    try { photo = await resizePhoto(file) }
    catch (err) { return showToast(err.message, 'error') }
    await handleInspectionFile(photo)
  }

  // Android app: the native camera. Cancelling the camera is not an error.
  async function captureInspectionImage() {
    if (!inspectionBatch.value || inspectionUploading.value) return
    let photo
    try { photo = await capturePhoto() }
    catch (err) { return showToast(err.message, 'error') }
    if (photo) await handleInspectionFile(photo)
  }

  // Every photo, picked or taken, goes through the same precheck before it is uploaded.
  async function handleInspectionFile(file) {
    if (!inspectionBatch.value) return
    Object.assign(inspectionForm.value, { mediaPublicId: '', previewUrl: '', filename: '', precheckWarnings: [], pendingFile: null })

    let warnings = []
    inspectionUploading.value = true
    try {
      warnings = await checkPhotoFile(file)
    } catch {
      // The browser could not decode the file; the upload step reports unsupported formats.
    } finally {
      inspectionUploading.value = false
    }
    inspectionForm.value.precheckWarnings = warnings

    // Hold back photos with real problems so the user can retake them before anything is stored.
    if (warnings.some((warning) => warning.level === 'warning')) {
      inspectionForm.value.pendingFile = file
      inspectionForm.value.filename = file.name
      return
    }
    await uploadPhoto(file)
  }

  function confirmPendingUpload() {
    const file = inspectionForm.value.pendingFile
    if (file && inspectionBatch.value) return uploadPhoto(file)
  }

  function discardPendingUpload() {
    Object.assign(inspectionForm.value, { filename: '', precheckWarnings: [], pendingFile: null })
  }

  async function saveInspectionImage() {
    const form = inspectionForm.value
    if (!inspectionBatch.value) return
    if (!form.mediaPublicId) return showToast('Hãy tải ảnh kiểm tra lên trước khi lưu.', 'error')
    const sampleVolumeMl = form.sampleVolumeMl === '' ? null : Number(form.sampleVolumeMl)
    if (sampleVolumeMl !== null && (!Number.isFinite(sampleVolumeMl) || sampleVolumeMl <= 0 || sampleVolumeMl > 1000000)) {
      return showToast('Thể tích mẫu phải lớn hơn 0 và không vượt quá 1.000.000 ml.', 'error')
    }
    inspectionSaving.value = true
    try {
      const response = await api(inspectionUrl(inspectionBatch.value.id), {
        method: 'POST',
        body: JSON.stringify({
          mediaPublicId: form.mediaPublicId,
          samplingMethod: form.samplingMethod,
          sampleVolumeMl,
          notes: form.notes.trim() || null,
        }),
      })
      aiInspections.value = [response.data, ...aiInspections.value.filter((item) => item.id !== response.data.id)]
      selectedAiInspection.value = response.data
      inspectionForm.value = emptyInspectionForm()
      aiInspectionError.value = ''
      showToast('Đã lưu ảnh kiểm tra vào hồ sơ lô giống.', 'success')
      runAiInspection(response.data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      inspectionSaving.value = false
    }
  }

  // Confirmed count and/or sample volume entered after analysis; the AI count is never changed.
  async function saveInspectionReview(inspection, changes) {
    if (!inspectionBatch.value) return false
    try {
      const response = await api(`${inspectionUrl(inspectionBatch.value.id)}/${inspection.id}`, { method: 'PATCH', body: JSON.stringify(changes) })
      aiInspections.value = aiInspections.value.map((item) => item.id === inspection.id ? response.data : item)
      if (selectedAiInspection.value?.id === inspection.id) selectedAiInspection.value = response.data
      showToast('Đã lưu kết quả xác nhận.', 'success')
      return true
    } catch (err) {
      showToast(err.message, 'error')
      return false
    }
  }

  // Only inspections without a result (pending/failed) can be deleted; the backend enforces it.
  async function deleteAiInspection(inspection) {
    if (!inspectionBatch.value) return
    if (!window.confirm('Xóa lần kiểm tra chưa có kết quả này? Ảnh mẫu đã tải lên cũng bị xóa.')) return
    try {
      await api(`${inspectionUrl(inspectionBatch.value.id)}/${inspection.id}`, { method: 'DELETE' })
      aiInspections.value = aiInspections.value.filter((item) => item.id !== inspection.id)
      if (selectedAiInspection.value?.id === inspection.id) selectedAiInspection.value = aiInspections.value[0] || null
      showToast('Đã xóa lần kiểm tra.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
      await loadAiInspectionHistory(inspectionBatch.value)
    }
  }

  return { openInspectionUpload, loadAiInspectionHistory, runAiInspection, uploadInspectionImage, uploadCapturedImage, captureInspectionImage, confirmPendingUpload, discardPendingUpload, saveInspectionImage, saveInspectionReview, deleteAiInspection }
}
