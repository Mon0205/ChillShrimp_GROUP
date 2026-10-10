
import { computed, onMounted, ref, watch } from 'vue'

import { selectFarm, useFarmContext } from '../../../composables/farm-context.js'
import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'

export function usePage() {
  const farmContext = useFarmContext()
  const farms = ref([])
  const supplies = ref([])
  const loading = ref(true)
  const listLoading = ref(false)
  const saving = ref(false)
  const deleting = ref(false)
  const error = ref('')
  const query = ref('')
  const categoryFilter = ref('')
  const lowStockOnly = ref(false)
  const page = ref(1)
  const pageSize = ref(10)
  const pagination = ref({ total: 0, pageCount: 1 })
  const dialog = ref(false)
  const formRef = ref(null)
  const editingSupply = ref(null)
  const deletingSupply = ref(null)
  const form = ref(emptyForm())
  const importDialog = ref(false)
  const importFormRef = ref(null)
  const importing = ref(false)
  const importTarget = ref(null)
  const importForm = ref(emptyImportForm())
  const importHistoryDialog = ref(false)
  const importHistoryLoading = ref(false)
  const importHistory = ref([])
  const adjustmentDialog = ref(false)
  const adjustmentFormRef = ref(null)
  const adjusting = ref(false)
  const adjustmentTarget = ref(null)
  const adjustmentForm = ref(emptyAdjustmentForm())
  const adjustmentHistoryDialog = ref(false)
  const adjustmentHistoryLoading = ref(false)
  const adjustmentHistory = ref([])

  const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
  const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
  const role = computed(() => selectedFarm.value?.role || '')
  const canManage = computed(() => ['owner', 'warehouse_staff'].includes(role.value))
  const canRequestSupply = computed(() => ['owner', 'area_manager', 'warehouse_staff'].includes(role.value))
  const pageCount = computed(() => Math.max(1, pagination.value.pageCount || 1))
  const categoryOptions = [
    { title: 'Thức ăn', value: 'feed' },
    { title: 'Thuốc', value: 'medicine' },
    { title: 'Hóa chất', value: 'chemical' },
    { title: 'Chế phẩm sinh học', value: 'probiotic' },
    { title: 'Khác', value: 'other' },
  ]
  const categoryNames = Object.fromEntries(categoryOptions.map(({ title, value }) => [value, title]))
  const requiredRule = (label) => (value) => String(value ?? '').trim().length > 0 || `${label} là bắt buộc.`
  const nameRules = [requiredRule('Tên vật tư'), (v) => String(v || '').trim().length <= 150 || 'Tên vật tư tối đa 150 ký tự.']
  const unitRules = [requiredRule('Đơn vị tính'), (v) => String(v || '').trim().length <= 20 || 'Đơn vị tính tối đa 20 ký tự.']
  const categoryRules = [requiredRule('Loại vật tư'), (v) => categoryOptions.some((item) => item.value === v) || 'Loại vật tư không hợp lệ.']
  const nonNegativeRule = (label, max, decimals) => (value) => {
    if (value === '' || value === null || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > max) return `${label} phải từ 0 đến ${max}.`
    const factor = 10 ** decimals
    return Math.abs(Number(value) * factor - Math.round(Number(value) * factor)) <= 1e-7 || `${label} có tối đa ${decimals} chữ số thập phân.`
  }
  const priceRules = [requiredRule('Đơn giá'), nonNegativeRule('Đơn giá', 9_999_999_999.99, 2)]
  const thresholdRules = [requiredRule('Ngưỡng cảnh báo'), nonNegativeRule('Ngưỡng cảnh báo', 999_999_999.999, 3)]
  const descriptionRules = [(v) => String(v ?? '').length <= 4000 || 'Mô tả tối đa 4.000 ký tự.']

  const importQuantityRule = (value) => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 999_999_999.999 && Math.abs(Number(value) * 1000 - Math.round(Number(value) * 1000)) < 1e-7 || 'Số lượng phải lớn hơn 0 và có tối đa 3 chữ số thập phân.'
  const importPriceRule = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 9_999_999_999.99 && Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) < 1e-7 || 'Đơn giá phải không âm và có tối đa 2 chữ số thập phân.'
  const importDateRule = (value) => Boolean(value) && !Number.isNaN(new Date(value).getTime()) || 'Thời gian nhập không hợp lệ.'
  const adjustmentQuantityRule = (value) => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 999_999_999.999 && Math.abs(Number(value) * 1000 - Math.round(Number(value) * 1000)) < 1e-7 || 'Số lượng phải lớn hơn 0, tối đa 3 chữ số thập phân.'
  const adjustmentDateRule = (value) => Boolean(value) && !Number.isNaN(new Date(value).getTime()) || 'Thời điểm điều chỉnh không hợp lệ.'

  function emptyForm() {
    return { name: '', category: 'feed', unit: 'kg', unitPrice: '0', minThreshold: '0', description: '' }
  }

  function emptyImportForm() {
    const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    return { quantity: '', unitPrice: '', transactionDate: localNow, notes: '' }
  }

  function emptyAdjustmentForm() {
    const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    return { direction: 'increase', quantity: '', transactionDate: localNow, reason: '' }
  }

  function farmUrl(path = '') { return `/farms/${encodeURIComponent(farmId.value)}${path}` }
  function formatNumber(value, digits = 3) { return Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: digits }) }

  async function loadFarms() {
    farms.value = (await api('/farms')).data
    farmContext.farms = farms.value
    farmContext.ready = true
    if (!farms.value.some((farm) => farm.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
  }

  async function loadSupplies() {
    if (!farmId.value) { supplies.value = []; return }
    listLoading.value = true
    error.value = ''
    try {
      const params = new URLSearchParams({ page: String(page.value), limit: String(pageSize.value) })
      if (query.value?.trim()) params.set('q', query.value.trim())
      if (categoryFilter.value) params.set('category', categoryFilter.value)
      if (lowStockOnly.value) params.set('lowStock', 'true')
      const result = await api(farmUrl(`/inventory-supplies?${params}`))
      supplies.value = result.data.items
      pagination.value = result.data.pagination
    } catch (err) {
      supplies.value = []
      error.value = err.message
      showToast(err.message, 'error')
    } finally { listLoading.value = false }
  }

  async function loadPage() {
    loading.value = true
    error.value = ''
    try { await loadFarms(); await loadSupplies() }
    catch (err) { error.value = err.message; showToast(err.message, 'error') }
    finally { loading.value = false }
  }

  function applyFilters() { page.value = 1; loadSupplies() }

  function openCreate() {
    editingSupply.value = null
    form.value = emptyForm()
    dialog.value = true
  }

  function openEdit(supply) {
    editingSupply.value = supply
    form.value = {
      name: supply.name,
      category: supply.category,
      unit: supply.unit,
      unitPrice: supply.unitPrice,
      minThreshold: supply.minThreshold,
      description: supply.description || '',
    }
    dialog.value = true
  }

  function formatDateTime(value) {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  }

  async function saveSupply() {
    const validation = await formRef.value?.validate()
    if (!validation?.valid) return showToast('Vui lòng kiểm tra các trường chưa hợp lệ.', 'error')
    saving.value = true
    try {
      const payload = {
        ...form.value,
        name: form.value.name.trim(),
        unit: form.value.unit.trim(),
        unitPrice: Number(form.value.unitPrice),
        minThreshold: Number(form.value.minThreshold),
        description: form.value.description.trim() || null,
      }
      const isEditing = Boolean(editingSupply.value)
      const path = isEditing ? farmUrl(`/inventory-supplies/${encodeURIComponent(editingSupply.value.id)}`) : farmUrl('/inventory-supplies')
      await api(path, { method: isEditing ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
      dialog.value = false
      showToast(isEditing ? 'Đã cập nhật vật tư.' : 'Đã thêm vật tư; tồn ban đầu bằng 0.', 'success')
      await loadSupplies()
    } catch (err) { showToast(err.message, 'error') }
    finally { saving.value = false }
  }

  async function deleteSupply() {
    if (!deletingSupply.value) return
    deleting.value = true
    try {
      await api(farmUrl(`/inventory-supplies/${encodeURIComponent(deletingSupply.value.id)}`), { method: 'DELETE' })
      showToast('Đã xóa vật tư.', 'success')
      deletingSupply.value = null
      await loadSupplies()
    } catch (err) { showToast(err.message, 'error') }
    finally { deleting.value = false }
  }

function openImport(supply) {
  importTarget.value = supply
  importForm.value = { ...emptyImportForm(), unitPrice: supply.unitPrice }
  importDialog.value = true
}

async function submitImport() {
  const validation = await importFormRef.value?.validate()
  if (!validation?.valid) return showToast('Vui lòng kiểm tra lại thông tin nhập kho.', 'error')
  if (importForm.value.notes.length > 4000) return showToast('Ghi chú không được vượt quá 4.000 ký tự.', 'error')
  importing.value = true
  try {
    await api(farmUrl('/inventory-transactions/imports'), {
      method: 'POST',
      body: JSON.stringify({
        supplyId: importTarget.value.id,
        quantity: Number(importForm.value.quantity),
        unitPrice: Number(importForm.value.unitPrice),
        transactionDate: new Date(importForm.value.transactionDate).toISOString(),
        notes: importForm.value.notes.trim() || null,
      }),
    })
    importDialog.value = false
    showToast('Nhập kho thành công, tồn kho đã được cập nhật.', 'success')
    await loadSupplies()
  } catch (err) { showToast(err.message, 'error') }
  finally { importing.value = false }
}

async function openImportHistory(supply) {
  importTarget.value = supply
  importHistory.value = []
  importHistoryDialog.value = true
  importHistoryLoading.value = true
  try {
    const result = await api(farmUrl(`/inventory-transactions/imports?supplyId=${encodeURIComponent(supply.id)}&page=1&limit=100`))
    importHistory.value = result.data.items
  } catch (err) {
    importHistoryDialog.value = false
    showToast(err.message, 'error')
  } finally { importHistoryLoading.value = false }
}


  function openAdjustment(supply) {
    adjustmentTarget.value = supply
    adjustmentForm.value = emptyAdjustmentForm()
    adjustmentDialog.value = true
  }

  async function submitAdjustment() {
    const validation = await adjustmentFormRef.value?.validate()
    if (!validation?.valid) return
    const reason = adjustmentForm.value.reason.trim()
    if (!reason || reason.length > 4000) return showToast('Lý do điều chỉnh là bắt buộc, tối đa 4.000 ký tự.', 'error')
    adjusting.value = true
    try {
      await api(farmUrl('/inventory-transactions/adjustments'), {
        method: 'POST',
        body: JSON.stringify({ supplyId: adjustmentTarget.value.id, direction: adjustmentForm.value.direction, quantity: Number(adjustmentForm.value.quantity), transactionDate: new Date(adjustmentForm.value.transactionDate).toISOString(), reason }),
      })
      adjustmentDialog.value = false
      showToast('Đã điều chỉnh tồn kho và ghi lịch sử.', 'success')
      await loadSupplies()
    } catch (err) { showToast(err.message, 'error') }
    finally { adjusting.value = false }
  }

  async function openAdjustmentHistory(supply) {
    adjustmentTarget.value = supply
    adjustmentHistory.value = []
    adjustmentHistoryDialog.value = true
    adjustmentHistoryLoading.value = true
    try {
      const result = await api(farmUrl(`/inventory-transactions/adjustments?supplyId=${encodeURIComponent(supply.id)}&page=1&limit=100`))
      adjustmentHistory.value = result.data.items
    } catch (err) {
      adjustmentHistoryDialog.value = false
      showToast(err.message, 'error')
    } finally { adjustmentHistoryLoading.value = false }
  }

  


  watch(farmId, () => { page.value = 1; loadSupplies() })
  watch(page, loadSupplies)
  watch(pageSize, () => { if (page.value === 1) loadSupplies(); else page.value = 1 })
  watch([categoryFilter, lowStockOnly], applyFilters)
  watch(query, (_value, _previous, onCleanup) => {
    const timer = setTimeout(applyFilters, 300)
    onCleanup(() => clearTimeout(timer))
  })
  onMounted(loadPage)

  return { supplies, loading, listLoading, saving, deleting, error, query, categoryFilter, lowStockOnly, page, pageSize, pagination, dialog, formRef, editingSupply, deletingSupply, form, importDialog, importFormRef, importing, importTarget, importForm, importHistoryDialog, importHistoryLoading, importHistory, adjustmentDialog, adjustmentFormRef, adjusting, adjustmentTarget, adjustmentForm, adjustmentHistoryDialog, adjustmentHistoryLoading, adjustmentHistory, farmId, canManage, canRequestSupply, pageCount, categoryOptions, categoryNames, requiredRule, nameRules, unitRules, categoryRules, priceRules, thresholdRules, descriptionRules, importQuantityRule, importPriceRule, importDateRule, adjustmentQuantityRule, adjustmentDateRule, formatNumber, loadSupplies, applyFilters, openCreate, openEdit, openImport, submitImport, openImportHistory, openAdjustment, submitAdjustment, openAdjustmentHistory, formatDateTime, saveSupply, deleteSupply, ref }
}
