import { useInspection } from './useInspection.js'
import { useForm } from './useForm.js'
import { computed, onMounted, ref, watch } from 'vue'

import { selectFarm, useFarmContext } from '../../../composables/farm-context.js'
import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'

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
  const inspectionDialog = ref(false)
  const aiInspections = ref([])
  const selectedAiInspection = ref(null)
  const inspectionUploading = ref(false)
  const inspectionSaving = ref(false)
  const inspectionAnalyzingId = ref(null)
  const aiInspectionLoading = ref(false)
  const inspectionBatch = ref(null)
  const aiInspectionError = ref('')
  const inspectionForm = ref(emptyInspectionForm())
  const formRef = ref(null)
  const editingBatch = ref(null)
  const selectedBatch = ref(null)
  const form = ref(emptyForm())
  const nextStatus = ref('')

  function emptyForm() {
    return {
      tankId: '', batchCode: '', supplierId: '', species: '',
      developmentStage: '', initialQuantity: '', currentEstimatedQuantity: '',
      stockedDate: new Date().toISOString().slice(0, 10), expectedSaleDate: '', notes: '',
    }
  }

  function emptyInspectionForm() {
    return { mediaPublicId: '', previewUrl: '', filename: '', samplingMethod: '', sampleVolumeMl: '', notes: '' }
  }

  const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
  const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
  const role = computed(() => selectedFarm.value?.role || '')
  const canView = computed(() => ['owner', 'farm_manager', 'area_manager', 'technician'].includes(role.value))
  const canManage = computed(() => ['owner', 'farm_manager', 'area_manager'].includes(role.value))
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
  const statusNames = Object.fromEntries(statusOptions.map(({ title, value }) => [value, title]))
  const speciesNames = Object.fromEntries(speciesOptions.map(({ title, value }) => [value, title]))
  const requiredRule = (label) => (value) => String(value ?? '').trim().length > 0 || `${label} là bắt buộc.`
  const batchCodeRules = [requiredRule('Mã lô'), (v) => String(v || '').trim().length <= 50 || 'Mã lô tối đa 50 ký tự.', (v) => /^[A-Za-z0-9][A-Za-z0-9_-]{1,49}$/.test(String(v || '').trim()) || 'Mã gồm chữ, số, dấu gạch ngang hoặc gạch dưới.']
  const quantityRules = [requiredRule('Số lượng'), (v) => Number.isSafeInteger(Number(v)) && Number(v) > 0 || 'Số lượng phải là số nguyên lớn hơn 0.']
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

  function openDetails(batch) {
    selectedBatch.value = batch
    detailDialog.value = true
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

  const { openInspectionUpload, loadAiInspectionHistory, runAiInspection, uploadInspectionImage, saveInspectionImage } = useInspection({ error, inspectionDialog, aiInspections, selectedAiInspection, inspectionUploading, inspectionSaving, inspectionAnalyzingId, aiInspectionLoading, inspectionBatch, aiInspectionError, inspectionForm, form, emptyInspectionForm, inspectionUrl, formatInspectionValue })
  const { openCreate, openEdit, saveBatch } = useForm({ saving, error, formDialog, formRef, editingBatch, form, emptyForm, canManage, isTechnician, dateOrderError, batchUrl, loadBatches, loadFormOptions, cleanOptional })

  watch(farmId, async () => {
    page.value = 1
    await Promise.all([loadBatches(), loadFormOptions()])
  })
  watch([search, statusFilter], () => { page.value = 1; loadBatches() })
  watch(page, loadBatches)
  watch(pageSize, () => { if (page.value === 1) loadBatches(); else page.value = 1 })
  onMounted(loadPage)

  return { farms, batches, suppliers, tanks, loading, listLoading, saving, statusSaving, error, search, statusFilter, page, pageSize, pagination, formDialog, detailDialog, statusDialog, inspectionDialog, aiInspections, selectedAiInspection, inspectionUploading, inspectionSaving, inspectionAnalyzingId, aiInspectionLoading, inspectionBatch, aiInspectionError, inspectionForm, formRef, editingBatch, selectedBatch, form, nextStatus, farmId, selectedFarm, role, canView, canManage, isTechnician, pageCount, statusOptions, speciesOptions, statusNames, speciesNames, requiredRule, batchCodeRules, quantityRules, lengthRule, dateOrderError, transitions, formatDate, formatTimestamp, formatQuantity, aiInspectionStatusNames, aiInspectionStatusClasses, formatInspectionValue, openInspectionUpload, loadAiInspectionHistory, runAiInspection, uploadInspectionImage, saveInspectionImage, loadPage, openCreate, openEdit, saveBatch, openDetails, openStatus, saveStatus, ref }
}
