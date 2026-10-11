import { useQuality } from './useQuality.js'
import { useInspection } from './useInspection.js'
import { useTracking } from './useTracking.js'
import { useForm } from './useForm.js'
import { computed, onMounted, ref, watch } from 'vue'

import { selectFarm, useFarmContext } from '../../../composables/farm-context.js'
import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'
import { uploadCloudinaryFile } from '../../../services/cloudinary.js'

export function usePage() {
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
  const pageSize = ref(10)
  const pagination = ref({ total: 0, pageCount: 0 })
  const formDialog = ref(false)
  const detailDialog = ref(false)
  const statusDialog = ref(false)
  const qualityDialog = ref(false)
  const qualityHistoryDialog = ref(false)
  const inspectionDialog = ref(false)
  const reviewDialog = ref(false)
  const qualityChecks = ref([])
  const aiInspections = ref([])
  const selectedAiInspection = ref(null)
  const quantityEvents = ref([])
  const growthSamples = ref([])
  const batchHistoryLoading = ref(false)
  const qualityLoading = ref(false)
  const qualitySaving = ref(false)
  const qualityUploading = ref(false)
  const inspectionUploading = ref(false)
  const inspectionSaving = ref(false)
  const inspectionAnalyzingId = ref(null)
  const aiInspectionLoading = ref(false)
  const certificateUploading = ref(false)
  const reviewSaving = ref(false)
  const quantityDialog = ref(false)
  const quantitySaving = ref(false)
  const growthDialog = ref(false)
  const growthSaving = ref(false)
  const selectedCheck = ref(null)
  const qualityBatch = ref(null)
  const inspectionBatch = ref(null)
  const aiInspectionError = ref('')
  const reviewForm = ref({ reviewStatus: 'confirmed', reviewNotes: '' })
  const qualityForm = ref(emptyQualityForm())
  const inspectionForm = ref(emptyInspectionForm())
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

  function emptyQualityForm() {
    return { checkType: 'visual', diseaseCode: '', sampleSize: '', liveCount: '', abnormalCount: '', testMethod: '', labName: '', evidencePublicId: '', evidenceResourceType: '', evidenceFormat: '', evidencePreviewUrl: '', evidenceName: '', result: 'pass', notes: '' }
  }

  function emptyInspectionForm() {
    return { mediaPublicId: '', previewUrl: '', filename: '', samplingMethod: 'ai', sampleVolumeMl: '', notes: '' }
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

  function inspectionUrl(batchId) {
    return `${batchUrl(batchId)}/ai-inspections`
  }

  const aiInspectionStatusNames = {
    pending: 'Đang chờ', processing: 'Đang xử lý', completed: 'Hoàn tất', failed: 'Lỗi',
  }
  const aiInspectionStatusClasses = {
    pending: '', processing: 'status-processing', completed: 'status-active', failed: 'status-failed',
  }

  function formatInspectionValue(value, digits = 2) {
    if (value === null || value === undefined || value === '') return '—'
    const number = Number(value)
    return Number.isFinite(number) ? number.toLocaleString('vi-VN', { maximumFractionDigits: digits }) : '—'
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
      const params = new URLSearchParams({ page: String(page.value), limit: String(pageSize.value) })
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

  function cleanOptional(value) {
    return String(value ?? '').trim() || null
  }

  const quantityEventNames = {
    stocking: 'Tiếp nhận ban đầu', mortality: 'Hao hụt / chết', sale: 'Xuất bán',
    transfer_in: 'Chuyển vào', transfer_out: 'Chuyển đi', adjustment: 'Điều chỉnh',
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

  const { openQualityHistory, openQualityForm, uploadQualityEvidence, saveQualityCheck, openReview, saveReview } = useQuality({ error, qualityDialog, qualityHistoryDialog, reviewDialog, qualityChecks, qualityLoading, qualitySaving, qualityUploading, reviewSaving, selectedCheck, qualityBatch, reviewForm, qualityForm, emptyQualityForm, qualityUrl })
  const { openInspectionUpload, loadAiInspectionHistory, runAiInspection, uploadInspectionImage, saveInspectionImage } = useInspection({ error, inspectionDialog, aiInspections, selectedAiInspection, inspectionUploading, inspectionSaving, inspectionAnalyzingId, aiInspectionLoading, inspectionBatch, aiInspectionError, inspectionForm, form, emptyInspectionForm, inspectionUrl, formatInspectionValue })
  const { openDetails, openQuantityForm, saveQuantityEvent, saveGrowthSample, quantityEventDelta } = useTracking({ error, detailDialog, qualityChecks, quantityEvents, growthSamples, batchHistoryLoading, quantityDialog, quantitySaving, growthDialog, growthSaving, quantityForm, growthForm, selectedBatch, emptyQuantityForm, batchUrl, loadBatches })
  const { openCreate, openEdit, saveBatch, uploadCertificate, regenerateInternalBatchCode, regenerateSupplierFallbackCode } = useForm({ saving, error, formDialog, certificateUploading, formRef, editingBatch, form, emptyForm, createBatchIdentifiers, canManage, isTechnician, dateOrderError, batchUrl, loadBatches, loadFormOptions, cleanOptional })

  watch(farmId, async () => {
    page.value = 1
    await Promise.all([loadBatches(), loadFormOptions()])
  })
  watch([search, statusFilter], () => { page.value = 1; loadBatches() })
  watch(page, loadBatches)
  watch(pageSize, () => { if (page.value === 1) loadBatches(); else page.value = 1 })
  onMounted(loadPage)

  return { farms, batches, suppliers, tanks, loading, listLoading, saving, statusSaving, error, search, statusFilter, page, pageSize, pagination, formDialog, detailDialog, statusDialog, qualityDialog, qualityHistoryDialog, inspectionDialog, reviewDialog, qualityChecks, aiInspections, selectedAiInspection, quantityEvents, growthSamples, batchHistoryLoading, qualityLoading, qualitySaving, qualityUploading, inspectionUploading, inspectionSaving, inspectionAnalyzingId, aiInspectionLoading, certificateUploading, reviewSaving, quantityDialog, quantitySaving, growthDialog, growthSaving, qualityBatch, inspectionBatch, aiInspectionError, reviewForm, qualityForm, inspectionForm, quantityForm, growthForm, formRef, editingBatch, selectedBatch, form, nextStatus, regenerateInternalBatchCode, regenerateSupplierFallbackCode, emptyGrowthForm, farmId, selectedFarm, role, canView, canManage, isTechnician, pageCount, statusOptions, speciesOptions, broodstockOptions, statusNames, checkTypeOptions, diseaseOptions, resultOptions, resultNames, reviewNames, speciesNames, broodstockNames, requiredRule, batchCodeRules, quantityRules, documentedRules, lengthRule, dateOrderError, transitions, formatDate, formatTimestamp, formatQuantity, aiInspectionStatusNames, aiInspectionStatusClasses, formatInspectionValue, openInspectionUpload, loadAiInspectionHistory, runAiInspection, uploadInspectionImage, saveInspectionImage, openQualityHistory, openQualityForm, uploadQualityEvidence, uploadCertificate, saveQualityCheck, openReview, saveReview, loadPage, openCreate, openEdit, saveBatch, openDetails, openQuantityForm, saveQuantityEvent, saveGrowthSample, quantityEventNames, quantityEventDelta, openStatus, saveStatus, ref }
}
