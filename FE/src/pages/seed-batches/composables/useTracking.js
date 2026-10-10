import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'

export function useTracking({ error, detailDialog, qualityChecks, quantityEvents, growthSamples, batchHistoryLoading, quantityDialog, quantitySaving, growthDialog, growthSaving, quantityForm, growthForm, selectedBatch, emptyQuantityForm, batchUrl, loadBatches }) {
  async function openDetails(batch) {
    detailDialog.value = true
    batchHistoryLoading.value = true
    quantityEvents.value = []
    growthSamples.value = []
    try {
      selectedBatch.value = (await api(batchUrl(batch.id))).data
      const [events, samples, checks] = await Promise.all([
        api(`${batchUrl(batch.id)}/quantity-events?limit=100`),
        api(`${batchUrl(batch.id)}/growth-samples?limit=100`),
        api(`${batchUrl(batch.id)}/quality-checks?limit=100`),
      ])
      quantityEvents.value = events.data.items
      growthSamples.value = samples.data.items
      qualityChecks.value = checks.data.items
    } catch (err) {
      detailDialog.value = false
      showToast(err.message, 'error')
    } finally {
      batchHistoryLoading.value = false
    }
  }

  function openQuantityForm() {
    quantityForm.value = { ...emptyQuantityForm(), quantity: selectedBatch.value?.currentEstimatedQuantity || '' }
    quantityDialog.value = true
  }

  async function saveQuantityEvent() {
    const f = quantityForm.value
    const quantity = Number(f.quantity)
    if (!Number.isSafeInteger(quantity) || quantity < 1) return showToast('Số lượng phải là số nguyên lớn hơn 0.', 'error')
    if (!f.reason.trim()) return showToast('Vui lòng nhập lý do biến động.', 'error')
    if (f.eventType === 'transfer' && !f.targetTankId) return showToast('Chọn ao/bể đích để chuyển lô.', 'error')
    if (f.eventType === 'transfer' && quantity !== selectedBatch.value.currentEstimatedQuantity) return showToast('Chỉ hỗ trợ chuyển toàn bộ số lượng lô hiện tại.', 'error')
    quantitySaving.value = true
    try {
      const payload = {
        eventType: f.eventType, quantity, reason: f.reason.trim(), notes: f.notes.trim() || null,
        occurredAt: f.occurredAt ? new Date(f.occurredAt).toISOString() : undefined,
        ...(f.eventType === 'adjustment' ? { adjustmentDirection: f.adjustmentDirection } : {}),
        ...(f.eventType === 'transfer' ? { targetTankId: f.targetTankId } : {}),
      }
      await api(`${batchUrl(selectedBatch.value.id)}/quantity-events`, { method: 'POST', body: JSON.stringify(payload) })
      quantityDialog.value = false
      showToast('Đã ghi nhận biến động số lượng.', 'success')
      await Promise.all([loadBatches(), openDetails({ id: selectedBatch.value.id })])
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      quantitySaving.value = false
    }
  }

  async function saveGrowthSample() {
    const f = growthForm.value
    const sampleCount = Number(f.sampleCount)
    if (!Number.isSafeInteger(sampleCount) || sampleCount < 1) return showToast('Cỡ mẫu phải là số nguyên lớn hơn 0.', 'error')
    const numericFields = ['totalSampleWeightG', 'averageWeightG', 'averageLengthMm', 'lengthMinMm', 'lengthMaxMm', 'estimatedQuantity', 'biomassKg', 'uniformityScore']
    for (const field of numericFields) {
      if (f[field] === '') continue
      const value = Number(f[field])
      if (!Number.isFinite(value) || value < 0 || (field === 'estimatedQuantity' && !Number.isSafeInteger(value)) || (field === 'uniformityScore' && value > 100)) {
        return showToast('Kiểm tra lại các chỉ số mẫu; số lượng phải nguyên và độ đồng đều từ 0 đến 100%.', 'error')
      }
    }
    if (f.lengthMinMm !== '' && f.lengthMaxMm !== '' && Number(f.lengthMinMm) > Number(f.lengthMaxMm)) return showToast('Chiều dài nhỏ nhất không được lớn hơn chiều dài lớn nhất.', 'error')
    growthSaving.value = true
    try {
      const payload = { method: f.method, sampleCount, sampledAt: new Date(f.sampledAt).toISOString(), notes: f.notes.trim() || null }
      for (const field of numericFields) payload[field] = f[field] === '' ? null : Number(f[field])
      await api(`${batchUrl(selectedBatch.value.id)}/growth-samples`, { method: 'POST', body: JSON.stringify(payload) })
      growthDialog.value = false
      showToast('Đã lưu mẫu tăng trưởng.', 'success')
      await openDetails({ id: selectedBatch.value.id })
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      growthSaving.value = false
    }
  }

  function quantityEventDelta(event) {
    if (event.eventType === 'mortality' || event.eventType === 'sale' || event.eventType === 'transfer_out' || (event.eventType === 'adjustment' && event.adjustmentDirection === 'decrease')) return -Number(event.quantity)
    if (event.eventType === 'adjustment' && !event.adjustmentDirection) return null
    return Number(event.quantity)
  }

  return { openDetails, openQuantityForm, saveQuantityEvent, saveGrowthSample, quantityEventDelta }
}
