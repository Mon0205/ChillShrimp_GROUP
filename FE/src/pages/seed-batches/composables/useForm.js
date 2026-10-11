import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'
import { uploadCloudinaryFile } from '../../../services/cloudinary.js'

export function useForm({ saving, error, formDialog, certificateUploading, formRef, editingBatch, form, emptyForm, createBatchIdentifiers, canManage, isTechnician, dateOrderError, batchUrl, loadBatches, loadFormOptions, cleanOptional }) {
  function regenerateInternalBatchCode() {
    form.value.batchCode = createBatchIdentifiers().batchCode
  }

  function regenerateSupplierFallbackCode() {
    form.value.supplierLotCode = createBatchIdentifiers().supplierLotCode
  }

  async function uploadCertificate(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    certificateUploading.value = true
    try {
      const uploaded = await uploadCloudinaryFile(`${batchUrl()}/attachments/upload-signature`, file)
      Object.assign(form.value, {
        healthCertificatePublicId: uploaded.publicId,
        healthCertificateFormat: uploaded.format,
        healthCertificateUrl: uploaded.secureUrl,
        healthCertificateName: file.name,
        healthCertificateChanged: true,
      })
      showToast('Đã tải giấy chứng nhận lên Cloudinary.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      certificateUploading.value = false
    }
  }

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
      supplierLotCode: batch.supplierLotCode,
      supplierId: batch.supplierId || '',
      species: batch.species,
      developmentStage: batch.developmentStage,
      broodstockLine: batch.broodstockLine || '',
      broodstockStatus: batch.broodstockStatus || 'unknown',
      source: batch.source,
      documentedQuantity: batch.documentedQuantity,
      productionDate: batch.productionDate ? String(batch.productionDate).slice(0, 10) : '',
      receivedAt: batch.receivedAt ? new Date(batch.receivedAt).toISOString().slice(0, 16) : '',
      transportDurationMinutes: batch.transportDurationMinutes ?? '',
      healthCertificateUrl: batch.healthCertificateUrl || '',
      healthCertificatePublicId: batch.healthCertificatePublicId || '',
      healthCertificateFormat: batch.healthCertificateFormat || '',
      healthCertificateName: batch.healthCertificateUrl ? 'Giấy chứng nhận hiện tại' : '',
      healthCertificateChanged: false,
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
      broodstockLine: cleanOptional(form.value.broodstockLine),
      broodstockStatus: form.value.broodstockStatus,
      notes: cleanOptional(form.value.notes),
    } : {
      ...(!editingBatch.value ? { tankId: form.value.tankId, initialQuantity: Number(form.value.initialQuantity) } : {}),
      batchCode: form.value.batchCode.trim().toUpperCase(),
      supplierLotCode: form.value.supplierLotCode.trim(),
      supplierId: form.value.supplierId || null,
      species: form.value.species,
      developmentStage: form.value.developmentStage.trim(),
      broodstockLine: cleanOptional(form.value.broodstockLine),
      broodstockStatus: form.value.broodstockStatus,
      source: form.value.source.trim(),
      documentedQuantity: Number(form.value.documentedQuantity),
      productionDate: form.value.productionDate || null,
      receivedAt: form.value.receivedAt ? new Date(form.value.receivedAt).toISOString() : null,
      transportDurationMinutes: form.value.transportDurationMinutes === '' ? null : Number(form.value.transportDurationMinutes),
      ...(form.value.healthCertificateChanged ? { healthCertificatePublicId: form.value.healthCertificatePublicId || null } : {}),
      stockedDate: form.value.stockedDate,
      expectedSaleDate: form.value.expectedSaleDate,
      notes: cleanOptional(form.value.notes),
    }
    try {
      await api(editingBatch.value ? batchUrl(editingBatch.value.id) : batchUrl(), {
        method: editingBatch.value ? 'PATCH' : 'POST', body: JSON.stringify(payload),
      })
      if (editingBatch.value && canManage.value && form.value.status !== editingBatch.value.status) {
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

  return { openCreate, openEdit, saveBatch, uploadCertificate, regenerateInternalBatchCode, regenerateSupplierFallbackCode }
}
