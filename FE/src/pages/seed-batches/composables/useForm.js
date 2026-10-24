import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'

export function useForm({ saving, error, formDialog, formRef, editingBatch, form, emptyForm, canManage, isTechnician, dateOrderError, batchUrl, loadBatches, loadFormOptions, cleanOptional }) {
  function openCreate() {
    editingBatch.value = null
    form.value = emptyForm()
    formDialog.value = true
  }

  function openEdit(batch) {
    editingBatch.value = batch
    form.value = {
      ...emptyForm(),
      status: batch.status,
      batchCode: batch.batchCode,
      supplierId: batch.supplierId || '',
      currentEstimatedQuantity: batch.currentEstimatedQuantity,
      species: batch.species,
      developmentStage: batch.developmentStage,
      stockedDate: String(batch.stockedDate).slice(0, 10),
      expectedSaleDate: String(batch.expectedSaleDate).slice(0, 10),
      notes: batch.notes || '',
    }
    formDialog.value = true
  }

  async function saveBatch() {
    const validation = await formRef.value?.validate()
    if (!validation?.valid) return
    if (!editingBatch.value && !form.value.tankId) {
      showToast('Vui lòng chọn ao/bể đang trống.', 'error')
      return
    }
    if (dateOrderError.value) {
      showToast(dateOrderError.value, 'error')
      return
    }
    saving.value = true
    const payload = isTechnician.value ? {
      species: form.value.species,
      developmentStage: form.value.developmentStage.trim(),
      notes: cleanOptional(form.value.notes),
    } : {
      ...(!editingBatch.value ? { tankId: form.value.tankId, initialQuantity: Number(form.value.initialQuantity) } : { currentEstimatedQuantity: Number(form.value.currentEstimatedQuantity) }),
      batchCode: form.value.batchCode.trim().toUpperCase(),
      supplierId: form.value.supplierId || null,
      species: form.value.species,
      developmentStage: form.value.developmentStage.trim(),
      stockedDate: form.value.stockedDate,
      expectedSaleDate: form.value.expectedSaleDate,
      notes: cleanOptional(form.value.notes),
    }
    try {
      await api(editingBatch.value ? batchUrl(editingBatch.value.id) : batchUrl(), {
        method: editingBatch.value ? 'PATCH' : 'POST', body: JSON.stringify(payload),
      })
      if (editingBatch.value && canManage.value && Number(form.value.currentEstimatedQuantity) !== 0 && form.value.status !== editingBatch.value.status) {
        await api(`${batchUrl(editingBatch.value.id)}/status`, { method: 'PATCH', body: JSON.stringify({ status: form.value.status }) })
      }
      formDialog.value = false
      showToast(editingBatch.value ? 'Đã cập nhật lô giống.' : 'Đã tiếp nhận lô giống.', 'success')
      await Promise.all([loadBatches(), loadFormOptions()])
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      saving.value = false
    }
  }

  return { openCreate, openEdit, saveBatch }
}
