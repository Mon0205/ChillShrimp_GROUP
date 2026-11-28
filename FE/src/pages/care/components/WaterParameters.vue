<script setup>
import { waterChartWindow } from './water-chart-window.js'
import { buildWaterChart } from './water-chart.js'
import Pagination from '../../../components/pagination/index.vue'
import DateRange from './DateRange.vue'
import LoadingIndicator from '../../../components/loading/index.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { selectFarm, useFarmContext } from '../../../composables/farm-context.js'
import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'

const props = defineProps({ tankId: { type: String, default: '' } })
const measurements = [
  { key: 'temperature', title: 'Nhiệt độ', unit: '°C' },
  { key: 'ph', title: 'pH', unit: '' },
  { key: 'salinity', title: 'Độ mặn', unit: 'ppt' },
  { key: 'dissolvedOxygen', title: 'DO', unit: 'mg/L' },
  { key: 'nh3', title: 'NH₃', unit: 'mg/L' },
  { key: 'tan', title: 'TAN', unit: 'mg/L' },
  { key: 'no2', title: 'NO₂', unit: 'mg/L' },
  { key: 'nitrate', title: 'NO₃', unit: 'mg/L' },
  { key: 'alkalinity', title: 'Độ kiềm', unit: 'mg/L CaCO₃' },
  { key: 'h2s', title: 'H₂S', unit: 'ppm' },
  { key: 'turbidity', title: 'Độ đục', unit: '' },
  { key: 'waterLevelM', title: 'Mực nước', unit: 'm' },
]
const methods = [
  { title: 'Đo thủ công', value: 'manual' },
  { title: 'Cảm biến IoT', value: 'iot' },
  { title: 'Phòng thí nghiệm', value: 'lab' },
]
const methodNames = Object.fromEntries(methods.map(({ title, value }) => [value, title]))

const farmContext = useFarmContext()
const farms = ref([])
const tanks = ref([])
const logs = ref([])
const pagination = ref({ total: 0, pageCount: 1 })
const loading = ref(true)
const listLoading = ref(false)
const saving = ref(false)
const error = ref('')
const dialog = ref(false)
const formRef = ref(null)
const page = ref(1)
const pageSize = ref(10)
const filters = ref({ tankId: props.tankId, from: '', to: '' })
const form = ref(emptyForm())

const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const selectedFarm = computed(() => farms.value.find((farm) => farm.id === farmId.value))
const role = computed(() => selectedFarm.value?.role || '')
const canRecord = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(role.value))
const selectedMeasurementId = ref('')
const chartMetric = ref('dissolvedOxygen')
const chartHours = ref(24)
const chartOffset = ref(0)
const chartTotal = ref(0)
const chartRange = computed(() => waterChartWindow(selectedMeasurement.value?.recordedAt, chartHours.value, chartOffset.value, filters.value))
const hoveredPointId = ref('')
const chartLogs = ref([])
const chartThresholdContext = ref(null)
const chartLoading = ref(false)
const chartError = ref('')
let chartRequest = 0
onUnmounted(() => { chartRequest++ })
const primaryMetrics = [
  { key: 'temperature', title: 'Nhiệt độ', unit: '°C', icon: 'mdi-thermometer', color: '#dc7c67' },
  { key: 'ph', title: 'pH', unit: '', icon: 'mdi-water-outline', color: '#279abc' },
  { key: 'dissolvedOxygen', title: 'DO', unit: 'mg/L', icon: 'mdi-air-filter', color: '#d59b37' },
  { key: 'salinity', title: 'Độ mặn', unit: 'ppt', icon: 'mdi-waves', color: '#23a68c' },
]
const selectedMeasurement = computed(() => logs.value.find(log => log.id === selectedMeasurementId.value)
  || [...logs.value].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0])
const activeMetric = computed(() => primaryMetrics.find(metric => metric.key === chartMetric.value))
const activeThreshold = computed(() => {
  const threshold = chartThresholdContext.value?.thresholds?.[chartMetric.value]
  if (!threshold) return null
  const normalize = unit => String(unit || '').trim().toLowerCase().replace(/\s/g,'').replace('‰','ppt')
  const expected = normalize(activeMetric.value.unit), actual = normalize(threshold.unit)
  return actual === expected || chartMetric.value === 'ph' && ['','ph'].includes(actual) ? threshold : null
})
const waterChart = computed(() => buildWaterChart(chartLogs.value, selectedMeasurement.value?.tank?.id || selectedMeasurement.value?.tankId, chartMetric.value, activeThreshold.value, chartRange.value))
const chartMarkerIds = computed(() => {
  const points=waterChart.value.points
  return new Set([points[0]?.id,points.at(-1)?.id,points.find(p=>p.value===waterChart.value.min)?.id,points.find(p=>p.value===waterChart.value.max)?.id,hoveredPointId.value])
})
const chartAnnotations = computed(() => {
  const points = waterChart.value.points
  const labels = []
  for (const point of points) {
    if (points.length > 10 && !chartMarkerIds.value.has(point.id)) continue
    if (labels.some(label => Math.abs(label.x - point.x) < 100)) continue
    labels.push(point)
  }
  return labels
})
function followChartPointer(event) {
  if(event.pointerType==='touch'||!waterChart.value.points.length)return
  const bounds=event.currentTarget.getBoundingClientRect(),x=(event.clientX-bounds.left)/bounds.width*600
  hoveredPointId.value=waterChart.value.points.reduce((closest,point)=>Math.abs(point.x-x)<Math.abs(closest.x-x)?point:closest).id
}
const pointColor = level => ({danger:'#d57068',warning:'#ce9a32'})[level] || '#159b80' 
const hoveredPoint = computed(() => waterChart.value.points.find(point => point.id === hoveredPointId.value))
const chartTimes = computed(() => {
  if (waterChart.value.from === null) return []
  const from=Date.parse(chartRange.value?.from),to=Date.parse(chartRange.value?.to)
  return from === to ? [from] : [from, from + (to - from) / 2, to]
})
function chartTime(value) {
  return new Intl.DateTimeFormat('vi-VN', {hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}).format(new Date(value))
}
const pageCount = computed(() => Math.max(1, pagination.value.pageCount || 1))
const tankRule = (value) => Boolean(value) || 'Vui lòng chọn ao/bể.'
const dateRule = (value) => Boolean(value) && !Number.isNaN(new Date(value).getTime()) || 'Thời điểm đo không hợp lệ.'
const methodRule = (value) => methods.some((method) => method.value === value) || 'Phương pháp đo không hợp lệ.'
function measurementRules(metric) {
  return [(value) => {
    if (value === '' || value === null) return true
    const number = Number(value)
    if (!Number.isFinite(number) || (metric.key !== 'temperature' && number < 0) || number < -999_999_999.999 || number > 999_999_999.999) {
      return `${metric.title} không nằm trong miền giá trị hợp lệ.`
    }
    if (metric.key === 'ph' && number > 14) return 'pH phải nằm trong khoảng 0 đến 14.'
    if (Math.abs(number * 1000 - Math.round(number * 1000)) > 1e-7) return `${metric.title} tối đa 3 chữ số thập phân.`
    return true
  }]
}

function emptyForm() {
  return {
    tankId: '',
    ...Object.fromEntries(measurements.map(({ key }) => [key, ''])),
    measurementMethod: '',
    measurementDevice: '',
    recordedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    notes: '',
  }
}

function farmUrl(suffix = '') { return `/farms/${encodeURIComponent(farmId.value)}${suffix}` }
function formatDateTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
function formatValue(value) { return value === null || value === undefined ? null : Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 3 }) }
function measuredValues(log) {
  return measurements.filter(({ key }) => log[key] !== null && log[key] !== undefined && log[key] !== '').map((metric) => `${metric.title}: ${formatValue(log[metric.key])}${metric.unit ? ` ${metric.unit}` : ''}`)
}

async function loadFarms() {
  farms.value = (await api('/farms')).data
  farmContext.farms = farms.value
  farmContext.ready = true
  if (!farms.value.some((farm) => farm.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
}

async function loadTanks() {
  tanks.value = []
  if (farmId.value) tanks.value = (await api(farmUrl('/ponds-tanks'))).data
}

function buildQuery() {
  const params = new URLSearchParams({ page: String(page.value), limit: String(pageSize.value) })
  if (filters.value.tankId) params.set('tankId', filters.value.tankId)
  if (filters.value.from) params.set('from', new Date(`${filters.value.from}T00:00:00`).toISOString())
  if (filters.value.to) params.set('to', new Date(`${filters.value.to}T23:59:59.999`).toISOString())
  return params.toString()
}

async function loadChartSeries() {
  const request = ++chartRequest
  const currentFarm = farmId.value
  const tankId = selectedMeasurement.value?.tank?.id || selectedMeasurement.value?.tankId
  chartLogs.value = []
  chartTotal.value = 0
  chartThresholdContext.value = null
  hoveredPointId.value = ''
  chartError.value = ''
  chartLoading.value = false
  if (!currentFarm || !tankId || !chartRange.value || listLoading.value || error.value || !canRecord.value) return
  chartLoading.value = true
  try {
    const params = new URLSearchParams(buildQuery())
    params.set('tankId', tankId)
    params.set('page', '1')
    params.set('limit', '100')
    params.set('chartMetric', chartMetric.value)
    params.set('from', chartRange.value.from)
    params.set('to', chartRange.value.to)
    params.set('includeThresholds', 'true')
    const response = await api(`/farms/${encodeURIComponent(currentFarm)}/water-parameter-logs?${params}`)
    if (request === chartRequest && currentFarm === farmId.value) { chartLogs.value = response.data.items; chartTotal.value = response.data.chartMeta?.total ?? response.data.items.length; chartThresholdContext.value = response.data.thresholdContext || null }
  } catch (err) {
    if (request === chartRequest && currentFarm === farmId.value) chartError.value = err.message
  } finally {
    if (request === chartRequest) chartLoading.value = false
  }
}

async function loadLogs() {
  if (!farmId.value) { logs.value = []; return }
  listLoading.value = true
  error.value = ''
  try {
    const result = await api(farmUrl(`/water-parameter-logs?${buildQuery()}`))
    logs.value = result.data.items
    pagination.value = result.data.pagination
  } catch (err) {
    logs.value = []
    error.value = err.message
    showToast(err.message, 'error')
  } finally { listLoading.value = false }
}

async function loadPage() {
  loading.value = true
  error.value = ''
  try { await loadFarms(); await Promise.all([loadTanks(), loadLogs()]) }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
  finally { loading.value = false }
}

function applyFilters() { page.value = 1; loadLogs() }
function openCreate() {
  form.value = emptyForm()
  dialog.value = true
}

async function saveLog() {
  const validation = await formRef.value?.validate()
  if (!validation?.valid) return showToast('Vui lòng kiểm tra các trường chưa hợp lệ.', 'error')
  if (!measurements.some(({ key }) => form.value[key] !== '' && form.value[key] !== null)) {
    return showToast('Nhập ít nhất một thông số đã đo.', 'error')
  }
  if (form.value.measurementDevice.length > 100) return showToast('Tên thiết bị đo tối đa 100 ký tự.', 'error')
  if (form.value.notes.length > 4000) return showToast('Ghi chú tối đa 4.000 ký tự.', 'error')

  saving.value = true
  try {
    const payload = {
      tankId: form.value.tankId,
      ...Object.fromEntries(measurements.map(({ key }) => [key, form.value[key] === '' ? null : Number(form.value[key])])),
      measurementMethod: form.value.measurementMethod,
      measurementDevice: form.value.measurementDevice.trim() || null,
      recordedAt: new Date(form.value.recordedAt).toISOString(),
      notes: form.value.notes.trim() || null,
    }
    const result = await api(farmUrl('/water-parameter-logs'), { method: 'POST', body: JSON.stringify(payload) })
    dialog.value = false
    window.dispatchEvent(new Event('alerts:refresh'))
    const alertCount = result.data.alerts?.length || 0
    showToast(alertCount ? `Đã lưu kết quả đo và tạo ${alertCount} cảnh báo môi trường.` : 'Đã ghi thông số môi trường.', alertCount ? 'warning' : 'success')
    await loadLogs()
  } catch (err) { showToast(err.message, 'error') }
  finally { saving.value = false }
}

watch(farmId, async () => {
  page.value = 1
  filters.value.tankId = ''
  try { await Promise.all([loadTanks(), loadLogs()]) }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
})

watch(() => props.tankId, async (tankId) => {
  filters.value.tankId = tankId
  page.value = 1
  try { await loadLogs() }
  catch (err) { error.value = err.message; showToast(err.message, 'error') }
})
onMounted(loadPage)
watch(() => [filters.value.from, filters.value.to], applyFilters)
watch(page, loadLogs)
watch(pageSize, () => { if (page.value === 1) loadLogs(); else page.value = 1 })
watch([() => selectedMeasurement.value?.id, chartHours, () => filters.value.from, () => filters.value.to], () => { chartOffset.value = 0 })
watch([() => selectedMeasurement.value?.id, chartHours, chartOffset, chartMetric, farmId, logs, listLoading, canRecord, () => selectedMeasurement.value?.tank?.id || selectedMeasurement.value?.tankId, () => filters.value.from, () => filters.value.to], loadChartSeries)
</script>

<template>
<section class="environment-page">
      <header class="care-panel-heading environment-heading"><div class="care-panel-title"><span class="care-panel-icon"><v-icon icon="mdi-water-thermometer-outline" size="24" /></span><h2>Môi trường nước</h2></div>      <div class="page-actions list-actions"><v-btn color="primary" prepend-icon="mdi-plus" :disabled="!canRecord || !tanks.length" @click="openCreate">Ghi kết quả đo</v-btn></div></header>
      <v-card class="list-card care-list-card" elevation="0">

      <div class="filter-row list-controls">
        <slot name="filters" />
        <DateRange v-model="filters" />
      </div>


      <section v-if="!loading && !listLoading && !error && selectedMeasurement" class="water-monitor" aria-label="Kết quả đo môi trường">
        <div class="water-reading-caption"><strong>{{ selectedMeasurement.tank?.code }} · {{ selectedMeasurement.tank?.name }}</strong><span>{{ formatDateTime(selectedMeasurement.recordedAt) }} · Kết quả đo trong trang hiện tại</span></div>
        <div class="water-metric-strip"><button v-for="metric in primaryMetrics" :key="metric.key" type="button" class="water-metric" :class="{ selected: chartMetric === metric.key }" :style="{ '--metric-color': metric.color }" :aria-pressed="chartMetric === metric.key" @click="chartMetric = metric.key"><v-icon :icon="metric.icon" size="25" /><div><span>{{ metric.title }}</span><strong>{{ formatValue(selectedMeasurement[metric.key]) ?? '—' }} <small>{{ metric.unit }}</small></strong></div></button></div>
        <div class="water-chart-panel"><div class="water-chart-heading"><h3>{{ activeMetric.title }} · {{ selectedMeasurement.tank?.code || selectedMeasurement.tank?.name }}</h3><span>{{ waterChart.points.length }} điểm / {{ chartTotal }} số đo<template v-if="chartTotal > waterChart.points.length"> · giữ đỉnh/đáy</template></span></div>
          <div class="chart-window-toolbar">
            <div class="chart-periods" role="group" aria-label="Khoảng xem biểu đồ"><button v-for="period in [{hours:24,label:'24 giờ'},{hours:168,label:'7 ngày'},{hours:720,label:'30 ngày'}]" :key="period.hours" type="button" :class="{active:chartHours === period.hours}" :aria-pressed="chartHours === period.hours" @click="chartHours = period.hours">{{ period.label }}</button></div>
            <div class="chart-window-navigation"><v-btn size="small" variant="text" prepend-icon="mdi-chevron-left" :disabled="chartLoading || !chartRange?.canOlder" @click="chartOffset++">Cũ hơn</v-btn><v-btn size="small" variant="text" append-icon="mdi-chevron-right" :disabled="chartLoading || chartOffset === 0" @click="chartOffset--">Mới hơn</v-btn></div>
          </div>
          <p v-if="chartRange" class="chart-window-caption">{{ formatDateTime(chartRange.from) }} — {{ formatDateTime(chartRange.to) }}<span v-if="chartOffset === 0"> · Kết thúc tại lần đo đang xem</span></p>
          <v-progress-linear v-if="chartLoading" indeterminate color="primary" class="mt-4" />
          <p v-else-if="chartError" class="water-chart-empty" role="status">{{ chartError }} <v-btn size="small" variant="text" @click="loadChartSeries">Thử lại</v-btn></p>
          <div v-else-if="waterChart.points.length" class="water-line-chart" @pointerleave="event => { if (event.pointerType === 'mouse') hoveredPointId = '' }">
            <div class="threshold-reference" :class="{missing:!activeThreshold}"><v-icon :icon="activeThreshold ? 'mdi-shield-check-outline' : 'mdi-information-outline'" size="15" /><span v-if="activeThreshold">Ngưỡng hiện hành · {{ formatDateTime(chartThresholdContext.asOf) }}<template v-if="chartThresholdContext.developmentStage"> · {{ chartThresholdContext.developmentStage }}</template></span><span v-else>Chưa có ngưỡng đã duyệt, còn hiệu lực và đúng đơn vị cho bể này.</span></div>
            <div class="line-chart-unit">{{ activeMetric.unit || activeMetric.title }}</div>
            <div class="line-chart-body">
              <div class="line-chart-axis"><span v-for="tick in waterChart.ticks" :key="tick.y" :style="{top:`${tick.y/2}%`}">{{ formatValue(tick.value) }}</span></div>
              <div class="line-chart-canvas" @pointermove="followChartPointer">
                <svg viewBox="0 0 600 200" preserveAspectRatio="none" role="group" :aria-label="`Biểu đồ đường ${activeMetric.title} của ${selectedMeasurement.tank?.code || selectedMeasurement.tank?.name}, ${waterChart.points.length} kết quả đo gần nhất trong khoảng lọc`">
                  <defs><linearGradient id="water-line-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#15a38b" stop-opacity=".18" /><stop offset="100%" stop-color="#15a38b" stop-opacity="0" /></linearGradient></defs>
                  <rect v-for="(band,index) in waterChart.bands" :key="`band-${index}`" class="water-threshold-band" :class="band.level" x="24" width="552" :y="band.y" :height="band.height" />
                  <line v-for="limit in waterChart.limits" :key="limit.key" class="water-threshold-limit" :class="limit.level" x1="24" x2="576" :y1="limit.y" :y2="limit.y" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"><title>{{ limit.key }}: {{ formatValue(limit.value) }} {{ activeMetric.unit }}</title></line>
                  <line v-for="tick in waterChart.ticks" :key="tick.y" x1="24" x2="576" :y1="tick.y" :y2="tick.y" stroke="#d5e2dd" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" />
                  <path v-for="(area,index) in activeThreshold ? [] : waterChart.areas" :key="index" :d="area" fill="url(#water-line-fill)" />
                  <line v-if="hoveredPoint" :x1="hoveredPoint.x" :x2="hoveredPoint.x" y1="24" y2="170" stroke="#83b9aa" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" />
                  <path :d="waterChart.path" fill="none" stroke="#159b80" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" class="water-series-line" />
                  <g v-for="point in waterChart.points" :key="point.id">
                    <circle class="water-chart-hit" :cx="point.x" :cy="point.y" r="12" fill="transparent" tabindex="0" role="button" :aria-label="`${formatDateTime(point.time)}: ${formatValue(point.value)} ${activeMetric.unit}`" :aria-describedby="hoveredPointId === point.id ? 'water-point-tooltip' : undefined" @pointerenter="hoveredPointId = point.id" @focus="hoveredPointId = point.id" @blur="hoveredPointId = ''" @click="hoveredPointId = point.id" @keydown.enter.prevent="hoveredPointId = point.id" @keydown.space.prevent="hoveredPointId = point.id" />
                  </g>
                </svg>
                <span v-for="point in waterChart.points.filter(point => waterChart.points.length <= 24 || chartMarkerIds.has(point.id))" :key="point.id" aria-hidden="true" class="water-reading-dot" :class="{ highlighted: hoveredPointId === point.id }" :style="{ left: `${point.x / 6}%`, top: `${point.y / 2}%`, backgroundColor: pointColor(point.level) }" />
                <span v-for="point in chartAnnotations" :key="'label-' + point.id" aria-hidden="true" class="water-reading-label" :style="{ left: `${point.x / 6}%`, top: `${point.y / 2}%`, color: pointColor(point.level) }">{{ formatValue(point.value) }}</span>
                <div v-if="hoveredPoint" id="water-point-tooltip" role="tooltip" class="water-point-tooltip" :style="{left:`clamp(80px, ${hoveredPoint.x/6}%, calc(100% - 80px))`,top:`${hoveredPoint.y/2}%`}"><time>{{ formatDateTime(hoveredPoint.time) }}</time><strong><i :style="{background:pointColor(hoveredPoint.level)}" />{{ activeMetric.title }} <b>{{ formatValue(hoveredPoint.value) }} <small>{{ activeMetric.unit }}</small></b></strong></div>
              </div>
            </div>
            <div class="line-chart-dates" :class="{'single-reading':chartTimes.length === 1}"><time v-for="time in chartTimes" :key="time">{{ chartTime(time) }}</time></div>
            <div v-if="activeThreshold" class="water-threshold-legend"><span v-for="item in waterChart.legend" :key="item.level" :class="item.level"><i /><b>{{ item.label }}</b> {{ item.text }} {{ activeMetric.unit }}</span></div>
            <p v-if="waterChart.points.length === 1" class="single-point-note">Chỉ có một kết quả đo trong khoảng lọc; chưa đủ để thể hiện xu hướng.</p>
          </div>
          <p v-else class="water-chart-empty">Chưa có kết quả {{ activeMetric.title }} của bể này trong khoảng lọc.</p>
        </div>
      </section>
      <LoadingIndicator v-if="loading" />
      <div v-else-if="error" class="state-message error-state">{{ error }}</div>
      <div v-else-if="!farmId" class="state-message">Chọn trang trại để xem thông số.</div>
      <p v-else-if="!listLoading && !logs.length" class="empty-message">Chưa có kết quả đo phù hợp.</p>
      <div v-else class="table-wrap">
        <h3 id="water-log-title" class="water-log-title">Nhật kí đo</h3>
        <div class="water-log-scroll" role="region" aria-labelledby="water-log-title" tabindex="0">
          <v-table class="mobile-records app-data-table log-table" density="comfortable">
            <thead><tr><th>Thời gian đo</th><th>Ao/bể</th><th>Các chỉ số đã ghi</th><th>Phương pháp / thiết bị</th><th>Người ghi</th><th>Ghi chú</th></tr></thead>
            <tbody>
              <tr v-for="item in logs" :key="item.id" class="measurement-row" :class="{ selected: selectedMeasurement?.id === item.id }" tabindex="0" :aria-label="`Xem kết quả đo ${item.tank.code} lúc ${formatDateTime(item.recordedAt)}`" @click="selectedMeasurementId = item.id" @keydown.enter.self="selectedMeasurementId = item.id" @keydown.space.self.prevent="selectedMeasurementId = item.id">
                <td data-label="Thời gian đo">{{ formatDateTime(item.recordedAt) }}</td>
                <td data-label="Ao/bể"><strong>{{ item.tank.name }}</strong><small>{{ item.tank.code }}</small></td>
                <td data-label="Các chỉ số đã ghi"><div class="measurement-list"><span v-for="entry in measuredValues(item)" :key="entry">{{ entry }}</span></div></td>
                <td data-label="Phương pháp / thiết bị">{{ methodNames[item.measurementMethod] }}<small v-if="item.measurementDevice">{{ item.measurementDevice }}</small></td>
                <td data-label="Người ghi">{{ item.recorder.displayName || item.recorder.email }}</td>
                <td data-label="Ghi chú" class="note-cell">{{ item.notes || '—' }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
        <Pagination v-model:page="page" v-model:page-size="pageSize" :total="pagination.total" :loading="listLoading" />
      </div>

      </v-card>

      <v-dialog v-model="dialog" max-width="850">
        <v-card class="form-card">
          <v-btn class="form-dialog-close" type="button" icon="mdi-close" size="small" variant="text" aria-label="Đóng form" :disabled="saving" @click="dialog = false" />
          <v-card-title>Ghi thông số môi trường</v-card-title>
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="saveLog">
              <div class="form-grid">
                <v-select v-model="form.tankId" :items="tanks" item-title="name" item-value="id" label="Ao/bể *" :rules="[tankRule]" />
                <v-text-field v-model="form.recordedAt" type="datetime-local" label="Thời điểm đo *" :rules="[dateRule]" />
                <v-select v-model="form.measurementMethod" :items="methods" label="Phương pháp đo *" :rules="[methodRule]" />
                <v-text-field v-model="form.measurementDevice" label="Thiết bị đo" maxlength="100" />
                <v-text-field v-for="metric in measurements" :key="metric.key" v-model="form[metric.key]" type="number" :min="metric.key === 'temperature' ? undefined : 0" :max="metric.key === 'ph' ? 14 : 999999999.999" step="0.001" :rules="measurementRules(metric)" :label="`${metric.title}${metric.unit ? ` (${metric.unit})` : ''}`" />
                <p class="form-hint">Để trống thông số chưa đo; cần nhập ít nhất một kết quả. Hệ thống sẽ đối chiếu ngưỡng đã được phê duyệt và tạo cảnh báo nếu vượt giới hạn.</p>
                <v-textarea v-model="form.notes" label="Ghi chú" rows="2" maxlength="4000" counter="4000" class="full-width" />
              </div>
            </v-form>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" :disabled="saving" @click="dialog = false">Hủy</v-btn><v-btn color="primary" :loading="saving" @click="saveLog">Lưu kết quả</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    </section>
</template>

<style scoped>
.environment-page { color:#173f3a; }
.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:24px; }
.eyebrow { margin:0 0 8px; color:#078575; font-size:10px; font-weight:800; letter-spacing:1px; }
h2 { margin:0; font-size:29px; line-height:1.2; font-weight:800; }
.subtitle { margin:8px 0 0; color:#71827e; font-size:13px; }
.filter-row { display:grid; grid-template-columns:minmax(150px,1fr) minmax(150px,1fr) auto; align-items:center; gap:12px; margin-bottom:16px; }
.state-message { padding:34px 20px; border:1px solid #dbe9e5; border-radius:8px; color:#71827e; background:#fff; text-align:center; }
.error-state { color:#a33b3b; }
.table-wrap { overflow:hidden; border:1px solid #dbe9e5; border-radius:8px; background:#fff; }
.log-table :deep(th) { color:#71827e; font-size:10px; font-weight:800; text-transform:uppercase; white-space:nowrap; }
.log-table :deep(td) { color:#34514c; font-size:12px; vertical-align:top; }
.log-table small { display:block; color:#83918e; font-size:10px; }
.measurement-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:3px 12px; min-width:0; }
.measurement-list span { color:#34514c; white-space:normal; overflow-wrap:anywhere; }
.note-cell { max-width:220px; }
.empty-row { height:100px; color:#83918e !important; text-align:center; }
.table-footer { display:flex; align-items:center; justify-content:space-between; min-height:52px; padding:0 14px; border-top:1px solid #e5eeeb; color:#71827e; font-size:11px; }
.pager { display:flex; align-items:center; gap:8px; }
.form-card { border-radius:8px !important; }
.form-card :deep(.v-card-title) { padding:20px 22px 8px; font-size:18px; font-weight:800; }
.form-card :deep(.v-card-text) { padding:12px 22px; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 14px; }
.form-hint { grid-column:1/-1; margin:0; color:#71827e; font-size:11px; }
.full-width { grid-column:1/-1; }
@media(max-width:760px) { .page-heading { align-items:flex-start; flex-direction:column; }.filter-row { grid-template-columns:1fr 1fr; }.filter-row .v-btn { grid-column:1/-1; }.form-grid { grid-template-columns:1fr; }.form-hint,.full-width { grid-column:auto; }.table-wrap { overflow-x:auto; } }
.empty-message { margin: 12px 0; color: #71827e; font-size: 13px; }

.water-log-title { margin: 0; padding: 12px 14px; font-size: 14px; color: #265b4b; }
.water-log-scroll {
  max-height: clamp(220px, 45dvh, 440px);
  overflow: auto;
  overscroll-behavior-y: contain;
  border-block: 1px solid #dbe9e5;
}
.water-log-scroll:focus-visible { outline: 2px solid #087f6e; outline-offset: -2px; }
.water-log-scroll :deep(.v-table__wrapper) { overflow: visible; }
.water-log-scroll :deep(thead th) { position: sticky; top: 0; z-index: 1; }
</style>
