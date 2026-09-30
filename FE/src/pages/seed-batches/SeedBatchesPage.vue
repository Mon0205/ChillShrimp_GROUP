<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../components/app-shell/AppShell.vue'
import { selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { showToast } from '../../composables/toast.js'
import { api } from '../../services/api.js'
import { uploadCloudinaryFile } from '../../services/cloudinary.js'

const farmContext = useFarmContext()
const farms = ref([])
const batches = ref([])
const suppliers = ref([])
const tanks = ref([])
const loading = ref(true)
const listLoading = ref(false)
const saving = ref(false)
const statusSaving = ref(false)
const error = ref('')
const search = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = 10
const pagination = ref({ total: 0, pageCount: 0 })
const formDialog = ref(false)
const detailDialog = ref(false)
const statusDialog = ref(false)
const qualityDialog = ref(false)
const qualityHistoryDialog = ref(false)
const reviewDialog = ref(false)
const qualityChecks = ref([])
const quantityEvents = ref([])
const growthSamples = ref([])
const batchHistoryLoading = ref(false)
const qualityLoading = ref(false)
const qualitySaving = ref(false)
const qualityUploading = ref(false)
const certificateUploading = ref(false)
const reviewSaving = ref(false)
const quantityDialog = ref(false)
const quantitySaving = ref(false)
const growthDialog = ref(false)
const growthSaving = ref(false)
const selectedCheck = ref(null)
const qualityBatch = ref(null)
const reviewForm = ref({ reviewStatus: 'confirmed', reviewNotes: '' })
const qualityForm = ref(emptyQualityForm())
const quantityForm = ref(emptyQuantityForm())
const growthForm = ref(emptyGrowthForm())
const formRef = ref(null)
const editingBatch = ref(null)
const selectedBatch = ref(null)
const form = ref(emptyForm())
const nextStatus = ref('')

function emptyForm() {
  const today = new Date().toISOString().slice(0, 10)
  const identifiers = createBatchIdentifiers()
  return {
    tankId: '', batchCode: identifiers.batchCode, supplierId: '', supplierLotCode: identifiers.supplierLotCode, species: 'white_leg_shrimp',
    developmentStage: 'PL12', broodstockLine: '', broodstockStatus: 'unknown', source: '',
    documentedQuantity: 0, initialQuantity: '', productionDate: '', receivedAt: '',
    transportDurationMinutes: '', healthCertificateUrl: '', healthCertificatePublicId: '', healthCertificateFormat: '', healthCertificateName: '', healthCertificateChanged: false, stockedDate: today,
    expectedSaleDate: '', notes: '',
  }
}

function createBatchIdentifiers() {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const suffix = () => crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
  return { batchCode: `CSB-${date}-${suffix()}`, supplierLotCode: `NOEXT-${date}-${suffix()}` }
}

function regenerateInternalBatchCode() {
  form.value.batchCode = createBatchIdentifiers().batchCode
}

function regenerateSupplierFallbackCode() {
  form.value.supplierLotCode = createBatchIdentifiers().supplierLotCode
}

function emptyQualityForm() {
  return { checkType: 'visual', diseaseCode: '', sampleSize: '', liveCount: '', abnormalCount: '', testMethod: '', labName: '', evidencePublicId: '', evidenceResourceType: '', evidenceFormat: '', evidencePreviewUrl: '', evidenceName: '', result: 'pass', notes: '' }
}

function emptyQuantityForm() {
  return { eventType: 'mortality', quantity: '', adjustmentDirection: 'decrease', targetTankId: '', occurredAt: new Date().toISOString().slice(0, 16), reason: '', notes: '' }
}

function emptyGrowthForm() {
  return { sampledAt: new Date().toISOString().slice(0, 16), method: 'manual', sampleCount: '', totalSampleWeightG: '', averageWeightG: '', averageLengthMm: '', lengthMinMm: '', lengthMaxMm: '', estimatedQuantity: '', biomassKg: '', uniformityScore: '', notes: '' }
}

const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const role = computed(() => selectedFarm.value?.role || '')
const canView = computed(() => ['owner', 'area_manager', 'technician'].includes(role.value))
const canManage = computed(() => ['owner', 'area_manager'].includes(role.value))
const isTechnician = computed(() => role.value === 'technician')
const pageCount = computed(() => Math.max(1, pagination.value.pageCount || 1))
const statusOptions = [
  { title: 'Đang ương', value: 'active' },
  { title: 'Sẵn sàng bán', value: 'ready_for_sale' },
  { title: 'Đã bán', value: 'sold' },
  { title: 'Thất bại', value: 'failed' },
  { title: 'Đã hủy', value: 'cancelled' },
]
const speciesOptions = [
  { title: 'Tôm thẻ chân trắng', value: 'white_leg_shrimp' },
  { title: 'Tôm sú', value: 'black_tiger_shrimp' },
]
const broodstockOptions = [
  { title: 'Chưa xác định', value: 'unknown' }, { title: 'SPF', value: 'spf' },
  { title: 'SPR', value: 'spr' }, { title: 'Thông thường', value: 'standard' },
]
const statusNames = Object.fromEntries(statusOptions.map(({ title, value }) => [value, title]))
const checkTypeOptions = [
  { title: 'Quan sát ngoại hình', value: 'visual' }, { title: 'Dị hình', value: 'deformity' },
  { title: 'Stress độ mặn', value: 'salinity_stress' }, { title: 'Stress formalin', value: 'formalin_stress' },
  { title: 'Soi kính hiển vi', value: 'microscopy' }, { title: 'PCR', value: 'pcr' },
]
const diseaseOptions = ['WSSV', 'TSV', 'YHV', 'IMNV', 'IHHNV', 'AHPND', 'EHP']
const resultOptions = [{ title: 'Đạt', value: 'pass' }, { title: 'Cảnh báo', value: 'warning' }, { title: 'Không đạt', value: 'fail' }, { title: 'Chưa kết luận', value: 'inconclusive' }]
const resultNames = Object.fromEntries(resultOptions.map(({ title, value }) => [value, title]))
const reviewNames = { pending: 'Chờ duyệt', confirmed: 'Đã xác nhận', action_required: 'Cần xử lý', resolved: 'Đã xử lý' }
const speciesNames = Object.fromEntries(speciesOptions.map(({ title, value }) => [value, title]))
const broodstockNames = Object.fromEntries(broodstockOptions.map(({ title, value }) => [value, title]))
const requiredRule = (label) => (value) => String(value ?? '').trim().length > 0 || `${label} là bắt buộc.`
const batchCodeRules = [requiredRule('Mã lô'), (v) => String(v || '').trim().length <= 50 || 'Mã lô tối đa 50 ký tự.', (v) => /^[A-Za-z0-9][A-Za-z0-9_-]{1,49}$/.test(String(v || '').trim()) || 'Mã gồm chữ, số, dấu gạch ngang hoặc gạch dưới.']
const quantityRules = [requiredRule('Số lượng'), (v) => Number.isSafeInteger(Number(v)) && Number(v) > 0 || 'Số lượng phải là số nguyên lớn hơn 0.']
const documentedRules = [(v) => Number.isSafeInteger(Number(v)) && Number(v) >= 0 || 'Số lượng chứng từ phải là số nguyên không âm.']
const lengthRule = (label, max) => (v) => String(v ?? '').length <= max || `${label} tối đa ${max} ký tự.`
const dateOrderError = computed(() => form.value.expectedSaleDate && form.value.stockedDate && form.value.expectedSaleDate < form.value.stockedDate ? 'Ngày dự kiến bán phải từ ngày thả trở đi.' : '')
const transitions = {
  active: [{ title: 'Sẵn sàng bán', value: 'ready_for_sale' }, { title: 'Thất bại', value: 'failed' }, { title: 'Hủy lô', value: 'cancelled' }],
  ready_for_sale: [{ title: 'Đã bán', value: 'sold' }],
  sold: [], failed: [], cancelled: [],
}

function batchUrl(batchId = '') {
  const base = `/farms/${encodeURIComponent(farmId.value)}/seed-batches`
  return batchId ? `${base}/${encodeURIComponent(batchId)}` : base
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function formatTimestamp(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function qualityUrl(batchId) {
  return `${batchUrl(batchId)}/quality-checks`
}

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

async function loadFarms() {
  const result = await api('/farms')
  farms.value = result.data
  farmContext.farms = result.data
  farmContext.ready = true
  if (!farms.value.some((farm) => farm.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
}

async function loadBatches() {
  batches.value = []
  pagination.value = { total: 0, pageCount: 0 }
  if (!farmId.value || !canView.value) return
  listLoading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(pageSize) })
    if (search.value.trim()) params.set('q', search.value.trim())
    if (statusFilter.value) params.set('status', statusFilter.value)
    const result = await api(`${batchUrl()}?${params}`)
    batches.value = result.data.items
    pagination.value = result.data.pagination
  } catch (err) {
    error.value = err.message
  } finally {
    listLoading.value = false
  }
}

async function loadFormOptions() {
  if (!canManage.value || !farmId.value) return
  try {
    const [tankResult, supplierResult] = await Promise.all([
      api(`/farms/${encodeURIComponent(farmId.value)}/ponds-tanks?status=empty`),
      api(`/farms/${encodeURIComponent(farmId.value)}/seed-suppliers?limit=100`),
    ])
    tanks.value = tankResult.data.filter((tank) => !tank.deletedAt)
    suppliers.value = supplierResult.data.items
  } catch (err) {
    showToast(err.message, 'error')
  }
}

async function loadPage() {
  loading.value = true
  try {
    await loadFarms()
    await loadBatches()
    await loadFormOptions()
  } catch (err) {
    error.value = err.message
    showToast(err.message, 'error')
  } finally {
    loading.value = false
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

function cleanOptional(value) {
  return String(value ?? '').trim() || null
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
    formDialog.value = false
    showToast(editingBatch.value ? 'Đã cập nhật lô giống.' : 'Đã tiếp nhận lô giống.', 'success')
    await Promise.all([loadBatches(), loadFormOptions()])
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    saving.value = false
  }
}

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

const quantityEventNames = {
  stocking: 'Tiếp nhận ban đầu', mortality: 'Hao hụt / chết', sale: 'Xuất bán',
  transfer_in: 'Chuyển vào', transfer_out: 'Chuyển đi', adjustment: 'Điều chỉnh',
}

function quantityEventDelta(event) {
  if (event.eventType === 'mortality' || event.eventType === 'sale' || event.eventType === 'transfer_out' || (event.eventType === 'adjustment' && event.adjustmentDirection === 'decrease')) return -Number(event.quantity)
  if (event.eventType === 'adjustment' && !event.adjustmentDirection) return null
  return Number(event.quantity)
}

function openStatus(batch) {
  selectedBatch.value = batch
  nextStatus.value = ''
  statusDialog.value = true
}

async function saveStatus() {
  if (!nextStatus.value || !selectedBatch.value) return
  statusSaving.value = true
  try {
    await api(`${batchUrl(selectedBatch.value.id)}/status`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus.value }) })
    statusDialog.value = false
    showToast('Đã cập nhật trạng thái lô giống.', 'success')
    await loadBatches()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    statusSaving.value = false
  }
}

watch(farmId, async () => {
  page.value = 1
  await Promise.all([loadBatches(), loadFormOptions()])
})
watch([search, statusFilter], () => { page.value = 1; loadBatches() })
watch(page, loadBatches)
onMounted(loadPage)
</script>

<template>
  <AppShell>
    <header class="page-header">
      <div><span class="eyebrow">SẢN XUẤT</span><h1>Lô giống</h1><p>Tiếp nhận, theo dõi thông tin và trạng thái các lô tôm giống theo ao/bể.</p></div>
      <v-btn v-if="canManage && selectedFarm" color="primary" prepend-icon="mdi-plus" @click="openCreate">Tiếp nhận lô</v-btn>
    </header>

    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />
    <div v-else-if="error" class="notice error-notice" role="alert"><span>{{ error }}</span><v-btn size="small" variant="text" color="error" @click="loadPage">Thử lại</v-btn></div>
    <template v-else-if="!farms.length">
      <v-card class="empty-card" elevation="0"><div class="empty-icon">+</div><h2>Chưa có trang trại</h2><p>Tạo hoặc tham gia trang trại trước khi quản lý lô giống.</p><v-btn to="/farms" color="primary" variant="outlined">Mở quản lý trang trại</v-btn></v-card>
    </template>
    <div v-else-if="!canView" class="permission-empty">Vai trò hiện tại không có quyền xem lô giống.</div>
    <template v-else>
      <section class="toolbar">
        <div class="toolbar-field farm-field"><label>Trang trại</label><v-select v-model="farmId" :items="farms" item-title="name" item-value="id" density="compact" variant="outlined" hide-details /></div>
        <div class="toolbar-field"><label>Tìm lô</label><v-text-field v-model="search" placeholder="Mã lô, mã nhà cung cấp, loài" prepend-inner-icon="mdi-magnify" clearable density="compact" variant="outlined" hide-details /></div>
        <div class="toolbar-field"><label>Trạng thái</label><v-select v-model="statusFilter" :items="[{ title: 'Tất cả trạng thái', value: '' }, ...statusOptions]" density="compact" variant="outlined" hide-details /></div>
        <div class="result-count"><strong>{{ pagination.total }}</strong><span>lô giống</span></div>
      </section>

      <v-card class="list-card" elevation="0">
        <div class="list-heading"><div><span class="eyebrow">THEO DÕI SẢN XUẤT</span><h2>{{ selectedFarm?.name }}</h2><p>Danh sách lô giống trong phạm vi quyền hiện tại.</p></div><span class="count-badge">{{ pagination.total }}</span></div>
        <v-progress-linear v-if="listLoading" class="list-progress" indeterminate color="primary" rounded />
        <div v-else-if="!batches.length" class="empty-state"><div>{{ search || statusFilter ? '⌕' : '0' }}</div><strong>{{ search || statusFilter ? 'Không tìm thấy lô phù hợp' : 'Chưa có lô giống' }}</strong><p>{{ canManage ? 'Tiếp nhận lô mới vào một ao/bể đang trống.' : 'Lô giống sẽ xuất hiện tại đây khi được tiếp nhận.' }}</p><v-btn v-if="canManage && !search && !statusFilter" color="primary" variant="outlined" size="small" @click="openCreate">Tiếp nhận lô</v-btn></div>
        <div v-else class="table-wrap"><table>
          <thead><tr><th>Mã lô</th><th>Loài / giai đoạn</th><th>Ao/bể</th><th>Nhà cung cấp</th><th>Số lượng hiện tại</th><th>Ngày thả</th><th>Trạng thái</th><th class="actions-heading">Thao tác</th></tr></thead>
          <tbody><tr v-for="batch in batches" :key="batch.id">
            <td><strong>{{ batch.batchCode }}</strong><small>Mã NCC: {{ batch.supplierLotCode }}</small></td>
            <td>{{ speciesNames[batch.species] || batch.species }}<small>{{ batch.developmentStage }}</small></td>
            <td>{{ batch.tank?.code }}<small>{{ batch.tank?.area?.name || 'Toàn trại' }}</small></td>
            <td>{{ batch.supplier?.name || batch.source || '—' }}</td>
            <td>{{ formatQuantity(batch.currentEstimatedQuantity) }}<small>Ban đầu {{ formatQuantity(batch.initialQuantity) }}</small></td>
            <td>{{ formatDate(batch.stockedDate) }}</td>
            <td><span class="status-tag" :class="`status-${batch.status}`">{{ statusNames[batch.status] || batch.status }}</span></td>
            <td><div class="row-actions"><button class="icon-btn" type="button" title="Xem chi tiết" aria-label="Xem chi tiết lô" @click="openDetails(batch)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/></svg></button><button v-if="isTechnician" class="status-action" type="button" @click="openQualityForm(batch)">Ghi kiểm tra</button><button class="status-action" type="button" @click="openQualityHistory(batch)">Chất lượng</button><button v-if="batch.status !== 'sold' && batch.status !== 'cancelled' && batch.status !== 'failed'" class="icon-btn" type="button" title="Cập nhật thông tin" aria-label="Cập nhật lô" @click="openEdit(batch)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button><button v-if="canManage && transitions[batch.status]?.length" class="status-action" type="button" @click="openStatus(batch)">Trạng thái</button></div></td>
          </tr></tbody>
        </table></div>
        <div v-if="!listLoading && pagination.pageCount > 1" class="pagination-row"><span>{{ pagination.total }} kết quả · Trang {{ page }}/{{ pageCount }}</span><v-pagination v-model="page" :length="pageCount" :total-visible="5" density="compact" rounded="lg" /></div>
      </v-card>
    </template>

    <v-dialog v-model="formDialog" max-width="820" scrollable>
      <v-card class="dialog-card"><span class="eyebrow">{{ editingBatch ? 'CẬP NHẬT HỒ SƠ' : 'TIẾP NHẬN ĐẦU VÀO' }}</span><h2>{{ editingBatch ? 'Thông tin lô giống' : 'Tiếp nhận lô giống' }}</h2>
        <v-form ref="formRef" class="dialog-form" validate-on="blur" @submit.prevent="saveBatch">
          <div v-if="!editingBatch" class="form-grid">
            <div class="span-2"><label>Ao/bể đang trống <span class="required-mark">*</span></label><v-select v-model="form.tankId" :items="tanks" :item-title="(tank) => `${tank.code} · ${tank.name}${tank.area?.name ? ` · ${tank.area.name}` : ''}`" item-value="id" placeholder="Chọn ao/bể" :rules="[requiredRule('Ao/bể')]" hide-details="auto" /></div>
            <div><label>Mã lô nội bộ <span class="required-mark">*</span></label><v-text-field v-model="form.batchCode" maxlength="50" :rules="batchCodeRules" readonly append-inner-icon="mdi-refresh" @click:append-inner="regenerateInternalBatchCode" hide-details="auto" /><small class="code-hint">Mã được tạo tự động; nhấn biểu tượng làm mới để tạo lại.</small></div>
            <div><label>Mã lô nhà cung cấp / mã thay thế <span class="required-mark">*</span></label><v-text-field v-model="form.supplierLotCode" maxlength="80" :rules="[requiredRule('Mã lô nhà cung cấp'), lengthRule('Mã lô nhà cung cấp', 80)]" append-inner-icon="mdi-refresh" @click:append-inner="regenerateSupplierFallbackCode" hide-details="auto" /><small class="code-hint">Nhập mã trên chứng từ nhà cung cấp. Nếu không có, giữ mã NOEXT được tạo tự động.</small></div>
          </div>
          <div class="form-grid">
            <template v-if="!isTechnician">
              <div v-if="editingBatch" class="span-2"><label>Mã lô</label><v-text-field v-model="form.batchCode" maxlength="50" :rules="batchCodeRules" hide-details="auto" /></div>
              <div v-if="editingBatch"><label>Mã lô nhà cung cấp</label><v-text-field v-model="form.supplierLotCode" maxlength="80" :rules="[requiredRule('Mã lô nhà cung cấp'), lengthRule('Mã lô nhà cung cấp', 80)]" hide-details="auto" /></div>
              <div><label>Nhà cung cấp</label><v-select v-model="form.supplierId" :items="[{ title: 'Không chọn', value: '' }, ...suppliers.map((supplier) => ({ title: supplier.name, value: supplier.id }))]" placeholder="Không bắt buộc" hide-details="auto" /></div>
            </template>
            <div><label>Loài <span class="required-mark">*</span></label><v-select v-model="form.species" :items="speciesOptions" :rules="[requiredRule('Loài')]" hide-details="auto" /></div>
            <div><label>Giai đoạn phát triển <span class="required-mark">*</span></label><v-text-field v-model="form.developmentStage" maxlength="50" :rules="[requiredRule('Giai đoạn'), lengthRule('Giai đoạn', 50)]" placeholder="PL12" hide-details="auto" /></div>
            <div><label>Dòng tôm bố mẹ</label><v-text-field v-model="form.broodstockLine" maxlength="100" :rules="[lengthRule('Dòng tôm bố mẹ', 100)]" hide-details="auto" /></div>
            <div><label>Tình trạng tôm bố mẹ</label><v-select v-model="form.broodstockStatus" :items="broodstockOptions" hide-details="auto" /></div>
            <template v-if="!isTechnician">
              <div><label>Nguồn giống <span class="required-mark">*</span></label><v-text-field v-model="form.source" maxlength="150" :rules="[requiredRule('Nguồn giống'), lengthRule('Nguồn giống', 150)]" placeholder="Tên cơ sở hoặc nguồn khai thác" hide-details="auto" /></div>
              <div v-if="!editingBatch"><label>Số lượng thực nhận <span class="required-mark">*</span></label><v-text-field v-model="form.initialQuantity" type="number" min="1" :rules="quantityRules" hide-details="auto" /></div>
              <div v-if="!editingBatch"><label>Số lượng theo chứng từ</label><v-text-field v-model="form.documentedQuantity" type="number" min="0" :rules="documentedRules" hide-details="auto" /></div>
              <div><label>Ngày sản xuất</label><v-text-field v-model="form.productionDate" type="date" hide-details="auto" /></div>
              <div><label>Thời điểm tiếp nhận</label><v-text-field v-model="form.receivedAt" type="datetime-local" hide-details="auto" /></div>
              <div><label>Thời gian vận chuyển (phút)</label><v-text-field v-model="form.transportDurationMinutes" type="number" min="0" :rules="[v => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0) || 'Nhập số phút nguyên không âm.']" hide-details="auto" /></div>
              <div><label>Ngày thả <span class="required-mark">*</span></label><v-text-field v-model="form.stockedDate" type="date" :rules="[requiredRule('Ngày thả')]" hide-details="auto" /></div>
              <div><label>Ngày dự kiến bán <span class="required-mark">*</span></label><v-text-field v-model="form.expectedSaleDate" type="date" :rules="[requiredRule('Ngày dự kiến bán'), () => !dateOrderError || dateOrderError]" :error-messages="dateOrderError" hide-details="auto" /></div>
              <div class="span-2"><label>Giấy chứng nhận kiểm dịch</label><input class="upload-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" :disabled="certificateUploading" @change="uploadCertificate"><div class="upload-hint">JPG, PNG, WEBP hoặc PDF · tối đa 10 MB</div><div v-if="form.healthCertificateName" class="uploaded-file"><span>{{ form.healthCertificateName }}</span><button type="button" :disabled="certificateUploading" @click="Object.assign(form, { healthCertificateUrl: '', healthCertificatePublicId: '', healthCertificateFormat: '', healthCertificateName: '', healthCertificateChanged: true })">Gỡ tệp</button></div><img v-if="form.healthCertificateUrl && ['jpg','jpeg','png','webp'].includes(form.healthCertificateFormat)" class="media-preview" :src="form.healthCertificateUrl" alt="Xem trước giấy chứng nhận"><iframe v-else-if="form.healthCertificateUrl && form.healthCertificateFormat === 'pdf'" class="document-preview" :src="form.healthCertificateUrl" title="Xem trước giấy chứng nhận PDF" /></div>
            </template>
            <div class="span-2"><label>Ghi chú</label><v-textarea v-model="form.notes" maxlength="4000" rows="2" auto-grow :rules="[lengthRule('Ghi chú', 4000)]" hide-details="auto" /></div>
          </div>
          <div class="dialog-actions"><v-btn variant="text" @click="formDialog = false">Hủy</v-btn><v-btn type="submit" color="primary" :loading="saving" :disabled="certificateUploading">{{ editingBatch ? 'Lưu thay đổi' : 'Tiếp nhận lô' }}</v-btn></div>
        </v-form>
      </v-card>
    </v-dialog>

    <v-dialog v-model="detailDialog" max-width="900" scrollable>
      <v-card class="dialog-card"><span class="eyebrow">HỒ SƠ LÔ GIỐNG</span><template v-if="selectedBatch"><h2>{{ selectedBatch.batchCode }}</h2><p class="detail-subtitle">{{ speciesNames[selectedBatch.species] || selectedBatch.species }} · {{ selectedBatch.developmentStage }}</p>
        <dl class="detail-grid"><div><dt>Trạng thái</dt><dd><span class="status-tag" :class="`status-${selectedBatch.status}`">{{ statusNames[selectedBatch.status] }}</span></dd></div><div><dt>Ao/bể</dt><dd>{{ selectedBatch.tank?.code }} · {{ selectedBatch.tank?.name }}</dd></div><div><dt>Khu vực</dt><dd>{{ selectedBatch.tank?.area?.name || 'Toàn trại' }}</dd></div><div><dt>Nhà cung cấp</dt><dd>{{ selectedBatch.supplier?.name || selectedBatch.source || '—' }}</dd></div><div><dt>Mã lô nhà cung cấp</dt><dd>{{ selectedBatch.supplierLotCode }}</dd></div><div><dt>Nguồn</dt><dd>{{ selectedBatch.source }}</dd></div><div><dt>Số lượng ban đầu</dt><dd>{{ formatQuantity(selectedBatch.initialQuantity) }}</dd></div><div><dt>Số lượng hiện tại</dt><dd>{{ formatQuantity(selectedBatch.currentEstimatedQuantity) }}</dd></div><div><dt>Theo chứng từ</dt><dd>{{ formatQuantity(selectedBatch.documentedQuantity) }}</dd></div><div><dt>Ngày thả</dt><dd>{{ formatDate(selectedBatch.stockedDate) }}</dd></div><div><dt>Dự kiến bán</dt><dd>{{ formatDate(selectedBatch.expectedSaleDate) }}</dd></div><div><dt>Tôm bố mẹ</dt><dd>{{ broodstockNames[selectedBatch.broodstockStatus] }}{{ selectedBatch.broodstockLine ? ` · ${selectedBatch.broodstockLine}` : '' }}</dd></div><div><dt>Ngày sản xuất</dt><dd>{{ formatDate(selectedBatch.productionDate) }}</dd></div><div><dt>Thời điểm tiếp nhận</dt><dd>{{ formatDate(selectedBatch.receivedAt) }}</dd></div><div v-if="selectedBatch.healthCertificateUrl" class="detail-wide"><dt>Giấy chứng nhận kiểm dịch</dt><dd><img v-if="['jpg','jpeg','png','webp'].includes(selectedBatch.healthCertificateFormat)" class="media-preview" :src="selectedBatch.healthCertificateUrl" alt="Giấy chứng nhận kiểm dịch"><iframe v-else-if="selectedBatch.healthCertificateFormat === 'pdf'" class="document-preview" :src="selectedBatch.healthCertificateUrl" title="Giấy chứng nhận kiểm dịch PDF" /><a :href="selectedBatch.healthCertificateUrl" target="_blank" rel="noopener noreferrer">Mở giấy chứng nhận</a></dd></div><div class="detail-wide"><dt>Ghi chú</dt><dd>{{ selectedBatch.notes || 'Không có ghi chú' }}</dd></div></dl>
        <section class="batch-history-section"><div class="history-section-heading"><div><h3>Biến động số lượng</h3><p>Số lượng hiện tại: {{ formatQuantity(selectedBatch.currentEstimatedQuantity) }} con</p></div><v-btn v-if="['active','ready_for_sale'].includes(selectedBatch.status)" size="small" color="primary" variant="outlined" @click="openQuantityForm">Ghi biến động</v-btn></div>
          <v-progress-linear v-if="batchHistoryLoading" indeterminate color="primary" />
          <p v-else-if="!quantityEvents.length" class="history-empty">Chưa có sự kiện số lượng.</p>
          <div v-else class="history-list"><article v-for="event in quantityEvents" :key="event.id" class="history-row"><div><strong>{{ quantityEventNames[event.eventType] || event.eventType }}</strong><small>{{ formatTimestamp(event.occurredAt) }} · {{ event.reason || '—' }}</small><small v-if="event.adjustmentDirection">Điều chỉnh {{ event.adjustmentDirection === 'increase' ? 'tăng' : 'giảm' }}</small><small v-if="event.fromTank || event.toTank">Ao/bể: {{ event.fromTank?.code || '—' }}{{ event.toTank ? ` → ${event.toTank.code}` : '' }}</small><small>Người ghi: {{ event.creator?.displayName || 'Tài khoản hiện tại' }}</small><small v-if="event.notes">{{ event.notes }}</small></div><b :class="{ 'quantity-negative': quantityEventDelta(event) < 0, 'quantity-positive': quantityEventDelta(event) > 0 }">{{ quantityEventDelta(event) === null ? '±' : quantityEventDelta(event) > 0 ? '+' : '' }}{{ quantityEventDelta(event) === null ? formatQuantity(event.quantity) : formatQuantity(quantityEventDelta(event)) }}</b></article></div>
        </section>
        <section class="batch-history-section"><div class="history-section-heading"><div><h3>Mẫu tăng trưởng</h3><p>Cỡ mẫu, khối lượng, kích thước và sinh khối theo từng lần lấy mẫu.</p></div><v-btn v-if="['active','ready_for_sale'].includes(selectedBatch.status)" size="small" color="primary" variant="outlined" @click="growthForm = emptyGrowthForm(); growthDialog = true">Ghi mẫu</v-btn></div>
          <v-progress-linear v-if="batchHistoryLoading" indeterminate color="primary" />
          <p v-else-if="!growthSamples.length" class="history-empty">Chưa có mẫu tăng trưởng.</p>
          <div v-else class="history-list"><article v-for="sample in growthSamples" :key="sample.id" class="history-row growth-row"><div><strong>{{ formatTimestamp(sample.sampledAt) }} · {{ sample.method === 'ai' ? 'AI' : sample.method === 'combined' ? 'Kết hợp' : 'Thủ công' }}</strong><small>Cỡ mẫu {{ formatQuantity(sample.sampleCount) }} con<span v-if="sample.averageWeightG !== null"> · {{ sample.averageWeightG }} g/con</span><span v-if="sample.averageLengthMm !== null"> · dài TB {{ sample.averageLengthMm }} mm</span></small><small><span v-if="sample.lengthMinMm !== null && sample.lengthMaxMm !== null">Khoảng dài {{ sample.lengthMinMm }}–{{ sample.lengthMaxMm }} mm · </span><span v-if="sample.estimatedQuantity !== null">Ước tính {{ formatQuantity(sample.estimatedQuantity) }} con · </span><span v-if="sample.biomassKg !== null">Sinh khối {{ sample.biomassKg }} kg · </span><span v-if="sample.uniformityScore !== null">Đồng đều {{ sample.uniformityScore }}%</span></small><small>Người ghi: {{ sample.sampler?.displayName || 'Tài khoản hiện tại' }}</small><small v-if="sample.notes">{{ sample.notes }}</small></div></article></div>
        </section>
        <section class="batch-history-section"><div class="history-section-heading"><div><h3>Lịch sử kiểm tra chất lượng</h3><p>Kết quả kiểm tra và trạng thái xử lý.</p></div><v-btn size="small" variant="text" @click="openQualityHistory(selectedBatch)">Mở đầy đủ</v-btn></div><p v-if="!qualityChecks.length" class="history-empty">Chưa có lần kiểm tra chất lượng.</p><div v-else class="history-list"><article v-for="check in qualityChecks.slice(0, 5)" :key="check.id" class="history-row"><div><strong>{{ checkTypeOptions.find(option => option.value === check.checkType)?.title || check.checkType }}</strong><small>{{ formatTimestamp(check.checkedAt) }} · {{ resultNames[check.result] || check.result }} · {{ reviewNames[check.reviewStatus] || check.reviewStatus }}</small></div></article></div></section>
      </template><div class="dialog-actions"><v-btn variant="text" @click="detailDialog = false">Đóng</v-btn></div></v-card>
    </v-dialog>

    <v-dialog v-model="quantityDialog" max-width="600"><v-card class="dialog-card"><span class="eyebrow">UC05.1.4 · BIẾN ĐỘNG SỐ LƯỢNG</span><h2>Ghi nhận biến động</h2><p class="detail-subtitle">{{ selectedBatch?.batchCode }} · hiện có {{ formatQuantity(selectedBatch?.currentEstimatedQuantity) }} con</p><div class="form-grid">
      <div><label>Loại biến động *</label><v-select v-model="quantityForm.eventType" :items="[{title:'Hao hụt / chết',value:'mortality'},...(canManage?[{title:'Điều chỉnh kiểm đếm',value:'adjustment'},{title:'Chuyển toàn bộ lô sang ao/bể khác',value:'transfer'}]:[])]" hide-details="auto" /></div>
      <div v-if="quantityForm.eventType === 'adjustment'"><label>Hướng điều chỉnh *</label><v-select v-model="quantityForm.adjustmentDirection" :items="[{title:'Tăng',value:'increase'},{title:'Giảm',value:'decrease'}]" hide-details="auto" /></div>
      <div><label>{{ quantityForm.eventType === 'transfer' ? 'Số lượng chuyển' : 'Số lượng biến động' }} *</label><v-text-field v-model="quantityForm.quantity" type="number" min="1" :readonly="quantityForm.eventType === 'transfer'" hide-details="auto" /></div>
      <div v-if="quantityForm.eventType === 'transfer'" class="span-2"><label>Ao/bể đích *</label><v-select v-model="quantityForm.targetTankId" :items="tanks.filter(tank => tank.id !== selectedBatch?.tankId)" :item-title="tank => `${tank.code} · ${tank.name}${tank.area?.name ? ` · ${tank.area.name}` : ''}`" item-value="id" hide-details="auto" /></div>
      <div><label>Thời điểm *</label><v-text-field v-model="quantityForm.occurredAt" type="datetime-local" hide-details="auto" /></div>
      <div class="span-2"><label>Lý do *</label><v-text-field v-model="quantityForm.reason" maxlength="1000" hide-details="auto" /></div>
      <div class="span-2"><label>Ghi chú</label><v-textarea v-model="quantityForm.notes" maxlength="4000" rows="2" auto-grow hide-details="auto" /></div>
    </div><div class="dialog-actions"><v-btn variant="text" @click="quantityDialog = false">Hủy</v-btn><v-btn color="primary" :loading="quantitySaving" @click="saveQuantityEvent">Lưu biến động</v-btn></div></v-card></v-dialog>

    <v-dialog v-model="growthDialog" max-width="760" scrollable><v-card class="dialog-card"><span class="eyebrow">UC05.1.5 · MẪU TĂNG TRƯỞNG</span><h2>Ghi nhận mẫu</h2><p class="detail-subtitle">{{ selectedBatch?.batchCode }}</p><div class="form-grid">
      <div><label>Thời điểm lấy mẫu *</label><v-text-field v-model="growthForm.sampledAt" type="datetime-local" hide-details="auto" /></div><div><label>Phương pháp *</label><v-select v-model="growthForm.method" :items="[{title:'Thủ công',value:'manual'},{title:'AI',value:'ai'},{title:'Kết hợp',value:'combined'}]" hide-details="auto" /></div>
      <div><label>Cỡ mẫu (con) *</label><v-text-field v-model="growthForm.sampleCount" type="number" min="1" hide-details="auto" /></div><div><label>Số lượng lô ước tính</label><v-text-field v-model="growthForm.estimatedQuantity" type="number" min="0" hide-details="auto" /></div>
      <div><label>Tổng khối lượng mẫu (g)</label><v-text-field v-model="growthForm.totalSampleWeightG" type="number" min="0" step="any" hide-details="auto" /></div><div><label>Khối lượng TB (g/con)</label><v-text-field v-model="growthForm.averageWeightG" type="number" min="0" step="any" hide-details="auto" /></div>
      <div><label>Chiều dài TB (mm)</label><v-text-field v-model="growthForm.averageLengthMm" type="number" min="0" step="any" hide-details="auto" /></div><div><label>Chiều dài nhỏ nhất (mm)</label><v-text-field v-model="growthForm.lengthMinMm" type="number" min="0" step="any" hide-details="auto" /></div>
      <div><label>Chiều dài lớn nhất (mm)</label><v-text-field v-model="growthForm.lengthMaxMm" type="number" min="0" step="any" hide-details="auto" /></div><div><label>Sinh khối (kg)</label><v-text-field v-model="growthForm.biomassKg" type="number" min="0" step="any" hide-details="auto" /></div>
      <div><label>Độ đồng đều (0–100%)</label><v-text-field v-model="growthForm.uniformityScore" type="number" min="0" max="100" step="any" hide-details="auto" /></div><div class="span-2"><label>Ghi chú</label><v-textarea v-model="growthForm.notes" maxlength="4000" rows="2" auto-grow hide-details="auto" /></div>
    </div><p class="calculation-hint">Nếu chỉ nhập tổng khối lượng mẫu, hệ thống tự tính khối lượng trung bình. Nếu có khối lượng trung bình và số lượng ước tính, sinh khối được tính khi chưa nhập giá trị.</p><div class="dialog-actions"><v-btn variant="text" @click="growthDialog = false">Hủy</v-btn><v-btn color="primary" :loading="growthSaving" @click="saveGrowthSample">Lưu mẫu</v-btn></div></v-card></v-dialog>

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

    <v-dialog v-model="reviewDialog" max-width="540"><v-card class="dialog-card"><span class="eyebrow">DUYỆT KIỂM TRA</span><h2>{{ reviewForm.reviewStatus === 'confirmed' ? 'Xác nhận kết quả' : reviewForm.reviewStatus === 'action_required' ? 'Yêu cầu xử lý' : 'Xác nhận đã xử lý' }}</h2><v-textarea v-model="reviewForm.reviewNotes" :label="reviewForm.reviewStatus === 'confirmed' ? 'Ghi chú (không bắt buộc)' : 'Hướng xử lý / kết quả xử lý *'" maxlength="4000" rows="3" auto-grow hide-details="auto" /><div class="dialog-actions"><v-btn variant="text" @click="reviewDialog = false">Hủy</v-btn><v-btn color="primary" :loading="reviewSaving" @click="saveReview">Lưu quyết định</v-btn></div></v-card></v-dialog>

    <v-dialog v-model="statusDialog" max-width="480"><v-card class="dialog-card"><span class="eyebrow">VÒNG ĐỜI LÔ</span><h2>Cập nhật trạng thái</h2><p>{{ selectedBatch?.batchCode }} · {{ statusNames[selectedBatch?.status] }}</p><v-select v-model="nextStatus" :items="transitions[selectedBatch?.status] || []" label="Trạng thái mới" hide-details="auto"/><div class="dialog-actions"><v-btn variant="text" @click="statusDialog = false">Hủy</v-btn><v-btn color="primary" :disabled="!nextStatus" :loading="statusSaving" @click="saveStatus">Xác nhận</v-btn></div></v-card></v-dialog>
  </AppShell>
</template>

<style scoped>
*{box-sizing:border-box}h1,h2,p{margin-top:0}h1{margin-bottom:9px;color:#134e4a;font-size:2.2rem}h2{margin-bottom:7px;color:#134e4a;font-size:1.25rem}.eyebrow{display:block;margin-bottom:8px;color:#087f6e;font-size:10px;font-weight:800;letter-spacing:.12em}.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px}.page-header p,.list-heading p,.detail-subtitle{margin:0;color:#70817e;font-size:13px}.toolbar{display:grid;grid-template-columns:minmax(200px,.9fr) minmax(230px,1.4fr) minmax(180px,.8fr) auto;align-items:end;gap:14px;padding:16px 20px;margin-bottom:18px;border:1px solid #dce7e4;border-radius:10px;background:#fff}.toolbar-field label,.dialog-form label{display:block;margin-bottom:6px;color:#48625e;font-size:11px;font-weight:700}.result-count{display:grid;min-width:78px;padding:0 8px 5px;text-align:right}.result-count strong{color:#087f6e;font-size:18px}.result-count span{color:#70817e;font-size:10px}.list-card{padding:24px;border:1px solid #dce7e4!important;border-radius:10px!important}.list-heading{display:flex;justify-content:space-between;gap:18px;padding-bottom:18px;border-bottom:1px solid #e5ecea}.count-badge{min-width:34px;height:30px;display:grid;place-items:center;border-radius:7px;color:#087f6e;background:#e7f4f1;font-size:11px;font-weight:800}.list-progress{margin-top:12px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th{padding:13px 9px;color:#82908d;border-bottom:1px solid #e8eeec;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}td{padding:13px 9px;color:#687b77;border-bottom:1px solid #edf1f0;font-size:11px;vertical-align:middle}tbody tr:last-child td{border-bottom:0}td strong,td small{display:block}td strong{color:#214c46;font-size:11px}td small{margin-top:4px;color:#899693;font-size:10px}.row-actions{display:flex;align-items:center;gap:5px;white-space:nowrap}.icon-btn{width:32px;height:32px;display:grid;place-items:center;border:0;border-radius:7px;color:#087f6e;background:#e7f4f1;cursor:pointer}.icon-btn svg{width:16px;height:16px}.status-action{padding:6px 8px;border:1px solid #bfdcd5;border-radius:6px;color:#087f6e;background:white;font-size:10px;cursor:pointer}.status-tag{display:inline-block;padding:5px 8px;border-radius:6px;background:#edf2f0;color:#65736f;font-size:9px;font-weight:750;white-space:nowrap}.status-active{background:#e0f3ed;color:#087f6e}.status-ready_for_sale{background:#fff2d4;color:#8a5a00}.status-sold{background:#e8efff;color:#3357a5}.status-failed,.status-cancelled{background:#fde9e7;color:#a33c34}.empty-state{display:grid;justify-items:center;padding:46px 20px;text-align:center}.empty-state>div{width:42px;height:42px;display:grid;place-items:center;margin-bottom:12px;border-radius:10px;background:#e7f4f1;color:#087f6e;font-size:20px}.empty-state strong{color:#214c46;font-size:14px}.empty-state p{margin:6px 0 14px;color:#7d8c88;font-size:12px}.pagination-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-top:14px;border-top:1px solid #e8eeec;color:#74827f;font-size:11px}.dialog-card{padding:26px!important;border-radius:10px!important}.dialog-form{display:grid;gap:9px;margin-top:18px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px}.span-2{grid-column:span 2}.required-mark{color:#c24137}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.detail-subtitle{margin-bottom:20px}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:20px 0 0}.detail-grid div{min-width:0}.detail-grid dt{margin-bottom:4px;color:#87938f;font-size:10px}.detail-grid dd{margin:0;color:#244b46;font-size:12px;overflow-wrap:anywhere}.detail-wide{grid-column:span 2}.permission-empty,.notice{padding:18px;border:1px solid #e0e9e6;border-radius:8px;background:#fff;color:#637873}.notice{display:flex;align-items:center;justify-content:space-between;gap:12px}.error-notice{color:#a33c34;border-color:#f0d1ce;background:#fff9f8}.empty-card{display:grid;justify-items:center;padding:48px 20px;border:1px solid #dce7e4!important;border-radius:10px!important;text-align:center}.empty-card h2{margin-top:12px}.empty-card p{color:#70817e;font-size:13px}.empty-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:10px;background:#e7f4f1;color:#087f6e;font-size:22px}
.quality-history{display:grid;gap:10px;margin-top:14px}.quality-entry{padding:14px;border:1px solid #e1eae7;border-radius:8px}.quality-entry-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.quality-entry-head strong{margin-right:auto;color:#214c46;font-size:13px}.quality-entry p{margin:9px 0 0;color:#657873;font-size:12px}.quality-entry a{display:inline-block;margin-top:8px;color:#087f6e;font-size:12px}.review-note{color:#8a5a00!important}.quality-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.upload-input{display:block;width:100%;padding:10px;border:1px solid #d6e2df;border-radius:7px;color:#48625e;font:inherit;font-size:12px}.upload-hint{margin-top:5px;color:#7d8c88;font-size:10px}.uploaded-file{display:flex;justify-content:space-between;gap:10px;margin-top:8px;color:#214c46;font-size:12px}.uploaded-file button{border:0;color:#a33c34;background:transparent;cursor:pointer}
.media-preview{display:block;max-width:100%;max-height:280px;margin-top:10px;border:1px solid #dce7e4;border-radius:7px;object-fit:contain}.document-preview{display:block;width:100%;height:320px;margin-top:10px;border:1px solid #dce7e4;border-radius:7px;background:#f7faf9}.evidence-preview{display:grid;gap:8px;margin-top:8px}.evidence-preview a,.detail-grid dd a{width:max-content;color:#087f6e;font-size:11px}
.batch-history-section{padding-top:18px;margin-top:20px;border-top:1px solid #e5ecea}.history-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.history-section-heading h3{margin:0;color:#244b46;font-size:14px}.history-section-heading p,.history-empty{margin:4px 0 0;color:#788984;font-size:11px}.history-list{display:grid;gap:8px}.history-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:11px 12px;border:1px solid #e5ecea;border-radius:7px}.history-row strong,.history-row small{display:block}.history-row strong{color:#244b46;font-size:12px}.history-row small{margin-top:4px;color:#788984;font-size:10px;line-height:1.45}.history-row b{flex:0 0 auto;font-size:13px}.quantity-negative{color:#a33c34}.quantity-positive{color:#087f6e}.calculation-hint{margin:12px 0 0;color:#71817d;font-size:11px;line-height:1.5}
.code-hint{display:block;margin-top:4px;color:#71817d;font-size:10px;line-height:1.4}
@media(max-width:900px){.toolbar{grid-template-columns:repeat(2,minmax(0,1fr))}.result-count{text-align:left}.list-card{padding:16px}.table-wrap{margin-inline:-8px}th,td{padding-inline:8px}}
@media(max-width:600px){.page-header{align-items:flex-start;flex-direction:column}.page-header h1{font-size:1.8rem}.toolbar{grid-template-columns:1fr;padding:14px}.form-grid,.detail-grid{grid-template-columns:1fr}.span-2,.detail-wide{grid-column:auto}.dialog-card{padding:18px!important}.pagination-row{align-items:flex-start;flex-direction:column}.result-count{display:flex;align-items:baseline;gap:6px}}
</style>
