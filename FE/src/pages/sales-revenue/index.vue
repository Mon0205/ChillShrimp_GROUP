<script setup>
import AppShell from '../../components/shell/index.vue'
import SectionTabs from '../../components/section-tabs/index.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadFarmContext, selectFarm, useFarmContext } from '../../composables/farm-context.js'
import { api } from '../../services/api.js'

// Revenue tab (spec: docs/superpowers/specs/2026-11-21-revenue-report-design.md; layout follows the
// "Doanh thu" sketches on the dashboard design canvas). Owner and farm manager only. Revenue =
// delivered revenue, counted in the month of delivery. An owner of two or more farms can also see
// all their farms combined.
const REPORT_ROLES = ['OWNER', 'FARM_MANAGER']
const DEFAULT_MONTHS = 6
const MAX_MONTHS = 24
const TOP_LOTS = 10
const batchStatusNames = { active: 'Đang ương', ready_for_sale: 'Sẵn sàng bán', sold: 'Đã bán', failed: 'Thất bại', cancelled: 'Đã hủy' }
const farmStatusNames = { active: 'Đang hoạt động', inactive: 'Ngừng hoạt động', archived: 'Đã lưu trữ' }

const route = useRoute()
const router = useRouter()
const farmContext = useFarmContext()
const contextLoading = ref(true)
const contextError = ref('')
const report = ref(null)
const loading = ref(false)
const error = ref('')
const ownedFarms = ref(0)
let controller = null

// Vietnamese calendar month and day, whatever the browser's time zone.
const vietnamNow = () => new Date(Date.now() + 7 * 60 * 60 * 1000)
function vietnamMonth(offset = 0) {
  const local = vietnamNow()
  const date = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}
const currentMonth = vietnamMonth()
const todayShort = (() => { const local = vietnamNow(); return `${String(local.getUTCDate()).padStart(2, '0')}/${String(local.getUTCMonth() + 1).padStart(2, '0')}` })()
const isMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')
const from = ref(isMonth(route.query.from) ? route.query.from : vietnamMonth(-(DEFAULT_MONTHS - 1)))
const to = ref(isMonth(route.query.to) ? route.query.to : vietnamMonth())
const scope = ref(route.query.scope === 'all' ? 'all' : 'farm')
const combined = computed(() => scope.value === 'all')

const selectedFarm = computed(() => farmContext.farms.find((farm) => farm.id === farmContext.farmId))
const role = computed(() => selectedFarm.value?.role || '')
const canView = computed(() => REPORT_ROLES.includes(role.value))
const showScope = computed(() => role.value === 'OWNER' && ownedFarms.value >= 2)

const monthCount = computed(() => {
  if (!isMonth(from.value) || !isMonth(to.value)) return 0
  const [fy, fm] = from.value.split('-').map(Number)
  const [ty, tm] = to.value.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm) + 1
})
const rangeError = computed(() => {
  if (!isMonth(from.value) || !isMonth(to.value)) return 'Chọn đủ từ tháng và đến tháng.'
  if (monthCount.value < 1) return 'Từ tháng phải trước hoặc bằng đến tháng.'
  if (monthCount.value > MAX_MONTHS) return `Chỉ xem tối đa ${MAX_MONTHS} tháng mỗi lần.`
  return ''
})

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ`
const count = (value) => Number(value || 0).toLocaleString('vi-VN')
const monthLabel = (key) => { const [year, month] = key.split('-'); return `${month}/${year}` }
const perFish = (revenue, quantity) => (Number(quantity) > 0 ? `${money(Number(revenue) / Number(quantity))}/con` : '—')
// Short amounts for chart labels: "248 tr", "1.050 tr".
function shortMoney(value) {
  const number = Number(value || 0)
  if (number >= 1e6) return `${(number / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: number >= 1e7 ? 0 : 1 })} tr`
  if (number >= 1e3) return `${(number / 1e3).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} nghìn`
  return count(number)
}
// The axis top is the next "round" value above the highest bar, so bars keep their scale.
function niceMax(value) {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  return [1, 2, 2.5, 5, 10].find((step) => step * power >= value) * power
}
const percentOf = (value, top) => `${(Number(value || 0) / top) * 100}%`

const includesToday = computed(() => report.value?.range.to === currentMonth)
const rangeText = computed(() => {
  const range = report.value?.range
  if (!range) return ''
  return `Từ ${monthLabel(range.from)} đến ${includesToday.value ? `${todayShort}/${range.to.slice(0, 4)}` : monthLabel(range.to)}`
})
const archivedCount = computed(() => (report.value?.byFarm || []).filter((row) => row.farm.status !== 'active').length)
const subtitle = computed(() => {
  if (combined.value) {
    const farms = report.value?.farms ?? ownedFarms.value
    return `Tất cả trại bạn sở hữu · ${farms} trại${archivedCount.value ? `, gồm ${archivedCount.value} trại đã ngừng hoặc đã lưu trữ` : ''}`
  }
  return [selectedFarm.value?.code, selectedFarm.value?.name, 'Doanh thu tính theo ngày giao hàng'].filter(Boolean).join(' · ')
})

const totals = computed(() => {
  const data = report.value
  if (!data) return []
  return [
    { label: 'Doanh thu', value: money(data.totals.revenue), sub: combined.value ? `${data.farms} trại · ${rangeText.value.replace('Từ ', '')}` : rangeText.value, main: true },
    { label: 'Số con đã giao', value: `${count(data.totals.deliveredQuantity)} con`, sub: Number(data.totals.deliveredQuantity) ? `Bình quân ${perFish(data.totals.revenue, data.totals.deliveredQuantity)}` : 'Chưa giao con nào' },
    { label: 'Giá trị đơn chốt', value: money(data.totals.orderValue), sub: 'Theo ngày xác nhận đơn' },
    { label: 'Tiền đã thu', value: money(data.totals.collected), sub: 'Theo ngày ghi thu tiền' },
    { label: 'Còn phải thu', value: money(data.outstanding.amount), sub: 'Tổng các đơn đang mở, không theo tháng' },
  ]
})

const monthChart = computed(() => {
  const months = report.value?.byMonth || []
  if (!months.length) return null
  const top = niceMax(Math.max(...months.flatMap((row) => [Number(row.revenue), Number(row.collected)])))
  return {
    top,
    ticks: [0, top / 2, top].map((value) => ({ value, label: value ? shortMoney(value) : '0', bottom: percentOf(value, top) })),
    groups: months.map((row) => {
      const current = row.month === currentMonth
      return {
        ...row,
        current,
        short: `T${Number(row.month.split('-')[1])}${current ? ` · đến ${todayShort}` : ''}`,
        revenueHeight: percentOf(row.revenue, top),
        collectedHeight: percentOf(row.collected, top),
      }
    }),
  }
})
const monthChartLabel = computed(() => (monthChart.value?.groups || [])
  .map((group) => `tháng ${monthLabel(group.month)}: doanh thu ${money(group.revenue)}, đã thu ${money(group.collected)}`)
  .join('; '))

// Horizontal bars: the top lots of the farm, or every farm in the combined view.
const rankBars = computed(() => {
  const data = report.value
  if (!data) return []
  const rows = combined.value
    ? data.byFarm.map((row) => ({ key: row.farm.id, name: `${row.farm.name} · ${row.farm.code}`, muted: row.farm.status !== 'active', revenue: row.revenue }))
    : data.byBatch.filter((row) => Number(row.revenue) > 0).slice(0, TOP_LOTS)
      .map((row) => ({ key: row.batchId, name: row.tank ? `${row.batchCode} · ${row.tank.code}` : row.batchCode, muted: false, revenue: row.revenue }))
  const top = Math.max(1, ...rows.map((row) => Number(row.revenue)))
  return rows.map((row) => ({ ...row, width: percentOf(row.revenue, top) }))
})
const rankLabel = computed(() => rankBars.value.map((bar) => `${bar.name} ${money(bar.revenue)}`).join('; '))
const batchTotals = computed(() => {
  const rows = report.value?.byBatch || []
  const delivered = rows.reduce((sum, row) => sum + row.deliveredQuantity, 0)
  const revenue = rows.reduce((sum, row) => sum + Number(row.revenue), 0)
  return { delivered, revenue }
})
const hasSales = computed(() => {
  const data = report.value
  return Boolean(data) && [data.totals.revenue, data.totals.orderValue, data.totals.collected].some((value) => Number(value) > 0)
})

function syncQuery() {
  const query = { ...route.query, from: from.value, to: to.value }
  if (combined.value) query.scope = 'all'
  else delete query.scope
  router.replace({ query })
}

async function load() {
  controller?.abort()
  error.value = ''
  if (!canView.value || rangeError.value) { report.value = null; return }
  const current = new AbortController()
  controller = current
  loading.value = true
  const params = new URLSearchParams({ from: from.value, to: to.value })
  const path = combined.value ? `/reports/revenue?${params}` : `/farms/${encodeURIComponent(farmContext.farmId)}/sales-orders/reports/revenue?${params}`
  try {
    const result = await api(path, { signal: current.signal })
    if (controller !== current) return
    report.value = result.data
    ownedFarms.value = combined.value ? result.data.farms : result.data.ownedFarms
  } catch (err) {
    if (controller !== current || err.name === 'AbortError') return
    report.value = null
    error.value = err.message
  } finally {
    if (controller === current) loading.value = false
  }
}

function reload() {
  syncQuery()
  load()
}

// A farm row in the combined view opens that farm's own report.
function openFarm(farm) {
  if (farm.status !== 'active' || !farmContext.farms.some((item) => item.id === farm.id)) return
  selectFarm(farm.id)
  scope.value = 'farm'
}

watch([from, to], reload)
watch(scope, () => { report.value = null; reload() })
watch([() => farmContext.farmId, role], () => {
  if (contextLoading.value) return
  ownedFarms.value = 0
  report.value = null
  if (role.value !== 'OWNER' && scope.value === 'all') scope.value = 'farm' // the scope watcher reloads
  else reload()
})

onMounted(async () => {
  try { await loadFarmContext() }
  catch (err) { contextError.value = err.message }
  finally { contextLoading.value = false }
  if (role.value !== 'OWNER') scope.value = 'farm'
  reload()
})
onBeforeUnmount(() => controller?.abort())
</script>

<template>
<AppShell>
  <section class="revenue-page">
    <SectionTabs section="business" />

    <v-progress-linear v-if="contextLoading" indeterminate color="primary" rounded />
    <div v-else-if="contextError" class="notice error-notice" role="alert">Không tải được danh sách trại: {{ contextError }}</div>
    <template v-else-if="!canView">
      <h1>Doanh thu</h1>
      <v-alert type="info" variant="tonal">Bạn không có quyền xem doanh thu của trại này.</v-alert>
    </template>

    <template v-else>
      <header class="page-head">
        <div class="heading">
          <h1>Doanh thu</h1>
          <p>{{ subtitle }}</p>
        </div>
        <form class="filters" aria-label="Bộ lọc báo cáo doanh thu" @submit.prevent>
          <div v-if="showScope" class="field">
            <label for="revenue-scope">Phạm vi</label>
            <select id="revenue-scope" v-model="scope">
              <option value="farm">Trại đang chọn</option>
              <option value="all">Tất cả trại của tôi ({{ ownedFarms }} trại)</option>
            </select>
          </div>
          <div class="field">
            <label for="revenue-from">Từ tháng</label>
            <input id="revenue-from" v-model.lazy="from" type="month" :max="to">
          </div>
          <div class="field">
            <label for="revenue-to">Đến tháng</label>
            <input id="revenue-to" v-model.lazy="to" type="month" :min="from">
          </div>
        </form>
      </header>

      <p v-if="rangeError" class="notice warn-notice" role="alert">{{ rangeError }}</p>
      <div v-else-if="error" class="notice error-notice" role="alert"><span>Không tải được báo cáo: {{ error }}</span><v-btn size="small" variant="text" @click="load">Thử lại</v-btn></div>
      <v-progress-linear v-if="loading" indeterminate color="primary" rounded aria-label="Đang tải báo cáo" />

      <div v-if="loading && !report" class="totals" aria-busy="true"><div v-for="n in 5" :key="n" class="total placeholder" /></div>

      <template v-if="report">
        <section class="totals" :aria-label="combined ? 'Số tổng của tất cả trại' : 'Số tổng trong khoảng'">
          <div v-for="item in totals" :key="item.label" class="total" :class="{ main: item.main }">
            <span class="total-label">{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <span class="total-sub">{{ item.sub }}</span>
          </div>
        </section>

        <section v-if="!hasSales" class="card empty">
          <h2>Chưa có doanh thu trong khoảng này</h2>
          <p>Không có đơn xác nhận, lần giao hay khoản thu nào {{ rangeText.toLowerCase() }}.</p>
        </section>

        <template v-else>
          <section class="card" aria-labelledby="by-month">
            <div class="card-head">
              <h2 id="by-month">{{ combined ? `Theo tháng (cộng ${report.farms} trại)` : 'Theo tháng' }}</h2>
              <div class="legend" aria-hidden="true">
                <span><span class="swatch revenue" />Doanh thu (đã giao)</span>
                <span><span class="swatch collected" />Tiền đã thu</span>
                <span><span class="swatch current" />Tháng chưa kết thúc</span>
              </div>
            </div>
            <div class="chart" role="img" :aria-label="`Doanh thu và tiền đã thu theo tháng: ${monthChartLabel}. Chi tiết ở bảng bên dưới.`">
              <div class="axis" aria-hidden="true"><span v-for="tick in monthChart.ticks" :key="tick.value" :style="{ bottom: tick.bottom }">{{ tick.label }}</span></div>
              <div class="plot" aria-hidden="true">
                <div v-for="tick in monthChart.ticks.slice(1)" :key="tick.value" class="gridline" :style="{ bottom: tick.bottom }" />
                <div class="groups">
                  <div v-for="group in monthChart.groups" :key="group.month" class="group" :title="`Tháng ${monthLabel(group.month)}: doanh thu ${money(group.revenue)}, đã thu ${money(group.collected)}`">
                    <div class="bar revenue" :class="{ current: group.current }" :style="{ height: group.revenueHeight }" />
                    <div class="bar collected" :class="{ current: group.current }" :style="{ height: group.collectedHeight }" />
                  </div>
                </div>
              </div>
            </div>
            <div class="months" aria-hidden="true"><span v-for="group in monthChart.groups" :key="group.month" :class="{ current: group.current }">{{ group.short }}</span></div>
            <div class="table-wrap">
              <table class="data-table month-table">
                <thead>
                  <tr><th scope="col" class="text">Tháng</th><th scope="col">Doanh thu</th><th scope="col">Số con đã giao</th><th scope="col">Giá trị đơn chốt</th><th scope="col">Tiền đã thu</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in report.byMonth" :key="row.month">
                    <td class="text">{{ monthLabel(row.month) }} <span v-if="row.month === currentMonth" class="hint">(đến {{ todayShort }})</span></td>
                    <td>{{ money(row.revenue) }}</td>
                    <td>{{ count(row.deliveredQuantity) }}</td>
                    <td>{{ money(row.orderValue) }}</td>
                    <td>{{ money(row.collected) }}</td>
                  </tr>
                  <tr class="total-row">
                    <td class="text">Tổng</td>
                    <td>{{ money(report.totals.revenue) }}</td>
                    <td>{{ count(report.totals.deliveredQuantity) }}</td>
                    <td>{{ money(report.totals.orderValue) }}</td>
                    <td>{{ money(report.totals.collected) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-if="combined" class="card" aria-labelledby="by-farm">
            <h2 id="by-farm">Theo trại</h2>
            <div class="rank" role="img" :aria-label="`Doanh thu theo trại: ${rankLabel}`">
              <template v-for="bar in rankBars" :key="bar.key">
                <span class="rank-name" :class="{ muted: bar.muted }">{{ bar.name }}</span>
                <div class="rank-track"><div class="rank-fill" :class="{ muted: bar.muted }" :style="{ width: bar.width }" /></div>
                <span class="rank-value">{{ shortMoney(bar.revenue) }}</span>
              </template>
            </div>
            <div class="table-wrap">
              <table class="data-table farm-table">
                <thead>
                  <tr><th scope="col" class="text">Trại</th><th scope="col" class="text">Trạng thái</th><th scope="col">Doanh thu</th><th scope="col">Số con đã giao</th><th scope="col">Giá trị đơn chốt</th><th scope="col">Tiền đã thu</th><th scope="col">Còn phải thu</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in report.byFarm" :key="row.farm.id" :class="{ muted: row.farm.status !== 'active' }">
                    <td class="text">
                      <button v-if="row.farm.status === 'active'" type="button" class="link" @click="openFarm(row.farm)">{{ row.farm.name }}</button>
                      <template v-else>{{ row.farm.name }}</template>
                      · {{ row.farm.code }}
                    </td>
                    <td class="text"><span class="tag" :class="`farm-${row.farm.status}`">{{ farmStatusNames[row.farm.status] || row.farm.status }}</span></td>
                    <td>{{ money(row.revenue) }}</td>
                    <td>{{ count(row.deliveredQuantity) }}</td>
                    <td>{{ money(row.orderValue) }}</td>
                    <td>{{ money(row.collected) }}</td>
                    <td>{{ money(row.outstanding.amount) }}</td>
                  </tr>
                  <tr class="total-row">
                    <td class="text" colspan="2">Tổng</td>
                    <td>{{ money(report.totals.revenue) }}</td>
                    <td>{{ count(report.totals.deliveredQuantity) }}</td>
                    <td>{{ money(report.totals.orderValue) }}</td>
                    <td>{{ money(report.totals.collected) }}</td>
                    <td>{{ money(report.outstanding.amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="note">Bấm tên trại đang hoạt động để chuyển sang trại đó và xem chi tiết theo lô. Trại đã ngừng hoặc đã lưu trữ chỉ xem được số liệu, không chuyển sang được.</p>
          </section>

          <section v-else class="card" aria-labelledby="by-lot">
            <div class="card-head">
              <h2 id="by-lot">Theo lô</h2>
              <span class="hint">Biểu đồ: {{ TOP_LOTS }} lô doanh thu cao nhất trong khoảng</span>
            </div>
            <div v-if="rankBars.length" class="rank" role="img" :aria-label="`Doanh thu theo lô: ${rankLabel}. Chi tiết ở bảng bên dưới.`">
              <template v-for="bar in rankBars" :key="bar.key">
                <span class="rank-name">{{ bar.name }}</span>
                <div class="rank-track"><div class="rank-fill" :style="{ width: bar.width }" /></div>
                <span class="rank-value">{{ shortMoney(bar.revenue) }}</span>
              </template>
            </div>
            <p v-if="!report.byBatch.length" class="note">Không có lô nào được đặt hoặc giao trong khoảng này.</p>
            <div v-else class="table-wrap">
              <table class="data-table lot-table">
                <thead>
                  <tr><th scope="col" class="text">Lô · ao/bể</th><th scope="col" class="text">Trạng thái lô</th><th scope="col">Số con đã đặt</th><th scope="col">Số con đã giao</th><th scope="col">Doanh thu</th><th scope="col">Đơn giá bình quân</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in report.byBatch" :key="row.batchId">
                    <td class="text"><router-link :to="`/seed-batches?batchId=${row.batchId}`" class="link">{{ row.batchCode }}</router-link><template v-if="row.tank"> · {{ row.tank.code }}</template></td>
                    <td class="text"><span class="tag" :class="`lot-${row.batchStatus}`">{{ batchStatusNames[row.batchStatus] || row.batchStatus }}</span></td>
                    <td>{{ count(row.orderedQuantity) }}</td>
                    <td>{{ count(row.deliveredQuantity) }}</td>
                    <td>{{ money(row.revenue) }}</td>
                    <td>{{ row.averagePrice ? `${money(row.averagePrice)}/con` : '—' }}</td>
                  </tr>
                  <tr class="total-row">
                    <td class="text" colspan="3">Tổng</td>
                    <td>{{ count(batchTotals.delivered) }}</td>
                    <td>{{ money(batchTotals.revenue) }}</td>
                    <td>{{ perFish(batchTotals.revenue, batchTotals.delivered) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="note">Bấm mã lô để mở chi tiết lô ở trang Lô giống. Lô đang bán dở có số con đã giao nhỏ hơn số con đã đặt.</p>
          </section>
        </template>
      </template>
    </template>
  </section>
</AppShell>
</template>

<style scoped>
.revenue-page { display: flex; flex-direction: column; gap: 22px; color: #1f3a35; }
h1 { margin: 0; color: #134e4a; font-size: 28px; font-weight: 700; }
h2 { margin: 0; color: #134e4a; font-size: 17px; }

.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.heading { display: flex; flex-direction: column; gap: 6px; }
.heading p { margin: 0; color: #5f716d; font-size: 14px; }
.filters { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { color: #4f6662; font-size: 12px; font-weight: 500; }
.field select, .field input { min-height: 40px; box-sizing: border-box; padding: 0 10px; border: 1px solid #b9c9c4; border-radius: 8px; background: #fff; color: #1f3a35; font: inherit; font-size: 14px; }
.field select { padding: 0 12px; }
.field select:focus-visible, .field input:focus-visible, .link:focus-visible { outline: 2px solid #087f6e; outline-offset: 2px; }

.notice { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0; padding: 12px 16px; border-radius: 12px; font-size: 13px; }
.error-notice { color: #9b3e3e; background: #fff0ef; }
.warn-notice { color: #7a5200; background: #fff7e3; }

.totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.total { display: flex; flex-direction: column; gap: 6px; box-sizing: border-box; padding: 16px 18px; border: 1px solid #dce7e4; border-radius: 14px; background: #fff; }
.total-label { color: #5f716d; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.total strong { color: #134e4a; font-size: 22px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.total-sub { color: #5f716d; font-size: 12px; }
.total.main { border-color: #9fd3c8; background: #f0f9f7; }
.total.main .total-label, .total.main .total-sub { color: #4f6662; }
.total.main strong { color: #087f6e; }
.total.placeholder { min-height: 96px; background: linear-gradient(90deg, #f1f5f4, #e7eeec, #f1f5f4); }

.card { display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; min-width: 0; padding: 20px; border: 1px solid #dce7e4; border-radius: 14px; background: #fff; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.empty { align-items: center; text-align: center; padding: 36px 20px; }
.empty p { margin: 0; color: #5f716d; font-size: 14px; }
.hint { color: #5f716d; font-size: 12px; font-weight: 400; }
.note { margin: 0; color: #5f716d; font-size: 12px; }

.legend { display: flex; gap: 16px; flex-wrap: wrap; color: #4f6662; font-size: 12px; }
.legend > span { display: flex; align-items: center; gap: 6px; }
.swatch { width: 12px; height: 12px; box-sizing: border-box; border-radius: 3px; }
.swatch.revenue { background: #087f6e; }
.swatch.collected { background: #9fd8cc; }
.swatch.current { border: 1.5px dashed #087f6e; }
.chart { display: flex; gap: 10px; }
.axis { position: relative; width: 52px; height: 180px; flex-shrink: 0; }
.axis span { position: absolute; right: 0; transform: translateY(50%); color: #5f716d; font-size: 11px; white-space: nowrap; }
.plot { position: relative; flex-grow: 1; min-width: 0; height: 180px; border-bottom: 1px solid #b9c9c4; }
.gridline { position: absolute; left: 0; right: 0; border-top: 1px dashed #e1e9e6; }
.groups { position: absolute; inset: 0; display: flex; align-items: flex-end; gap: 10px; }
.group { flex: 1 1 0; height: 100%; display: flex; justify-content: center; align-items: flex-end; gap: 4px; }
.bar { width: 30%; max-width: 26px; min-height: 1px; box-sizing: border-box; border-radius: 4px 4px 0 0; }
.bar.revenue { background: #087f6e; }
.bar.collected { background: #9fd8cc; }
.bar.current { border: 1.5px dashed #087f6e; border-bottom: 0; }
.bar.revenue.current { opacity: .55; }
.months { display: flex; gap: 10px; padding-left: 62px; }
.months span { flex: 1 1 0; text-align: center; color: #4f6662; font-size: 12px; }
.months span.current { color: #134e4a; font-weight: 700; }

.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.month-table { min-width: 640px; }
.lot-table { min-width: 760px; }
.farm-table { min-width: 820px; }
.data-table th, .data-table td { padding: 10px 8px; text-align: right; }
.data-table th { color: #5f716d; font-size: 12px; font-weight: 700; border-bottom: 1px solid #dce7e4; }
.data-table td { border-bottom: 1px solid #edf2f0; font-variant-numeric: tabular-nums; }
.data-table .text { text-align: left; }
.data-table tr.muted td { color: #4f6662; }
.data-table .total-row td { border-bottom: 0; color: #134e4a; font-weight: 700; }
.link { padding: 0; border: 0; background: none; color: #087f6e; font: inherit; font-weight: 500; text-decoration: none; cursor: pointer; }
.link:hover { color: #05594d; text-decoration: underline; }
.tag { display: inline-block; padding: 3px 8px; border-radius: 6px; background: #edf2f0; color: #4f6662; font-size: 12px; white-space: nowrap; }
.lot-active, .farm-active { background: #e0f3ed; color: #076656; }
.lot-ready_for_sale { background: #fff2d4; color: #7a5000; }
.lot-sold { background: #e8efff; color: #2f4f96; }
.lot-failed, .lot-cancelled { background: #fde9e7; color: #a33c34; }

.rank { display: grid; grid-template-columns: minmax(150px, 200px) minmax(0, 1fr) 80px; align-items: center; gap: 10px 14px; }
.rank-name { font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }
.rank-name.muted { color: #4f6662; }
.rank-track { height: 14px; border-radius: 4px; background: #edf2f0; }
.rank-fill { height: 14px; min-width: 2px; border-radius: 4px; background: #087f6e; }
.rank-fill.muted { background: #8fa29d; }
.rank-value { color: #4f6662; font-size: 13px; text-align: right; white-space: nowrap; }

@media (max-width: 600px) {
  .filters, .field { width: 100%; }
  .field select, .field input { width: 100%; }
  .rank { grid-template-columns: minmax(0, 1fr) auto; }
  .rank-track { display: none; }
  .axis { width: 44px; }
  .months { padding-left: 54px; }
  .months span { font-size: 10px; }
}
</style>
