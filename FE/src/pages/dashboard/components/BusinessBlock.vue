<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { api } from '../../../services/api.js'
import { compactMoney, count, money, niceMax, vietnamToday } from '../format.js'

// "Kinh doanh" block for the owner and the farm manager. Figures come from the dashboard summary (which reuses the
// revenue report's service); the "Theo lô" view asks the revenue report for the per-lot rows the first time it is chosen.
const props = defineProps({
  business: { type: Object, required: true },
  farmId: { type: String, required: true },
})

const TOP_LOTS = 10
const batchStatusNames = { active: 'Đang ương', ready_for_sale: 'Sẵn sàng bán', sold: 'Đã bán', failed: 'Thất bại', cancelled: 'Đã hủy' }
const view = ref('revenue')
const lots = ref(null)
const lotsLoading = ref(false)
const lotsError = ref('')
let controller = null

const today = computed(() => vietnamToday())
const monthLabel = (key) => `${key.slice(5, 7)}/${key.slice(0, 4)}`
const title = computed(() => (view.value === 'lot' ? 'Kinh doanh · theo lô' : `Kinh doanh · tháng ${Number(props.business.month.slice(5, 7))}, tính đến ${today.value.label}`))

const chart = computed(() => {
  const months = props.business.byMonth
  if (!months.length) return null
  const top = niceMax(Math.max(...months.flatMap((row) => [Number(row.revenue), Number(row.collected)])))
  const percent = (value) => `${(Number(value) / top) * 100}%`
  return {
    ticks: [0, top / 2, top].map((value) => ({ value, label: compactMoney(value), bottom: `${(value / top) * 100}%` })),
    groups: months.map((row) => {
      const current = row.month === props.business.month
      return { ...row, current, short: `T${Number(row.month.slice(5, 7))}${current ? ` · đến ${today.value.label}` : ''}`, revenueHeight: percent(row.revenue), collectedHeight: percent(row.collected) }
    }),
  }
})
const chartLabel = computed(() => props.business.byMonth.map((row) => `tháng ${monthLabel(row.month)}: doanh thu ${money(row.revenue)}, đã thu ${money(row.collected)}`).join('; '))

const rankBars = computed(() => {
  const rows = (lots.value || []).filter((row) => Number(row.revenue) > 0).slice(0, TOP_LOTS)
  const top = Math.max(1, ...rows.map((row) => Number(row.revenue)))
  return rows.map((row) => ({ key: row.batchId, name: row.tank ? `${row.batchCode} · ${row.tank.code}` : row.batchCode, revenue: row.revenue, width: `${(Number(row.revenue) / top) * 100}%` }))
})
const lotTotals = computed(() => {
  const rows = lots.value || []
  const delivered = rows.reduce((sum, row) => sum + row.deliveredQuantity, 0)
  const revenue = rows.reduce((sum, row) => sum + Number(row.revenue), 0)
  return { delivered, revenue, average: delivered > 0 ? revenue / delivered : null }
})

async function loadLots() {
  controller?.abort()
  const current = new AbortController()
  controller = current
  lotsLoading.value = true
  lotsError.value = ''
  const months = props.business.byMonth
  const params = new URLSearchParams({ from: months[0].month, to: months[months.length - 1].month })
  try {
    const result = await api(`/farms/${encodeURIComponent(props.farmId)}/sales-orders/reports/revenue?${params}`, { signal: current.signal })
    if (controller === current) lots.value = result.data.byBatch
  } catch (err) {
    if (controller === current && err.name !== 'AbortError') lotsError.value = err.message
  } finally {
    if (controller === current) lotsLoading.value = false
  }
}

function choose(next) {
  view.value = next
  if (next === 'lot' && lots.value === null && !lotsLoading.value) loadLots()
}
// A refresh of the summary can change the figures, so lot rows fetched earlier are dropped and fetched again if shown.
watch(() => props.business, () => {
  lots.value = null
  if (view.value === 'lot') loadLots()
})
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section class="business" aria-labelledby="business-heading">
    <div class="head">
      <h2 id="business-heading">{{ title }}</h2>
      <div class="head-actions">
        <div class="switch" role="radiogroup" aria-label="Xem kinh doanh theo">
          <button type="button" role="radio" :aria-checked="view === 'revenue'" :class="{ on: view === 'revenue' }" @click="choose('revenue')">Theo doanh thu</button>
          <button type="button" role="radio" :aria-checked="view === 'lot'" :class="{ on: view === 'lot' }" @click="choose('lot')">Theo lô</button>
        </div>
        <router-link to="/sales-revenue" class="link">Xem báo cáo đầy đủ →</router-link>
      </div>
    </div>

    <div class="tiles">
      <div class="tile main"><span class="label">Doanh thu</span><strong>{{ money(business.revenue) }}</strong><span class="sub">Số con đã giao × đơn giá</span></div>
      <div class="tile cost"><span class="label">Chi phí vật tư</span><strong>{{ money(business.materialCost) }}</strong><span class="sub">Vật tư đã xuất dùng</span></div>
      <div class="tile profit"><span class="label">Lợi nhuận gộp</span><strong>{{ money(business.grossProfit) }}</strong><span class="sub">Doanh thu − chi phí vật tư<template v-if="business.marginPercent !== null"> · biên {{ business.marginPercent }}%</template></span></div>
      <router-link to="/sales-orders?payment=due" class="tile link-tile" :aria-label="`Còn phải thu ${money(business.outstanding.amount)}, ${count(business.outstanding.orders)} đơn còn nợ. Xem các đơn còn nợ`">
        <span class="label">Còn phải thu</span><strong>{{ money(business.outstanding.amount) }}</strong><span class="sub accent">{{ count(business.outstanding.orders) }} đơn còn nợ · Xem đơn →</span>
      </router-link>
    </div>

    <div v-if="view === 'revenue'" class="view">
      <div class="view-head">
        <span class="label">Doanh thu và tiền đã thu · 6 tháng</span>
        <div class="legend" aria-hidden="true"><span><i class="swatch revenue" />Doanh thu</span><span><i class="swatch collected" />Tiền đã thu</span><span><i class="swatch current" />Tháng chưa kết thúc</span></div>
      </div>
      <div v-if="chart" class="chart" role="img" :aria-label="`Doanh thu và tiền đã thu theo tháng: ${chartLabel}`">
        <div class="axis" aria-hidden="true"><span v-for="tick in chart.ticks" :key="tick.value" :style="{ bottom: tick.bottom }">{{ tick.label }}</span></div>
        <div class="plot" aria-hidden="true">
          <div v-for="tick in chart.ticks.slice(1)" :key="tick.value" class="gridline" :style="{ bottom: tick.bottom }" />
          <div class="groups">
            <div v-for="group in chart.groups" :key="group.month" class="group" :title="`Tháng ${monthLabel(group.month)}: doanh thu ${money(group.revenue)}, đã thu ${money(group.collected)}`">
              <div class="bar revenue" :class="{ current: group.current }" :style="{ height: group.revenueHeight }" />
              <div class="bar collected" :class="{ current: group.current }" :style="{ height: group.collectedHeight }" />
            </div>
          </div>
        </div>
      </div>
      <div v-if="chart" class="months" aria-hidden="true"><span v-for="group in chart.groups" :key="group.month" :class="{ current: group.current }">{{ group.short }}</span></div>
      <p class="foot-line">Tháng này đã thu <strong>{{ money(business.collected) }}</strong> · đã giao <strong>{{ count(business.deliveredQuantity) }} con</strong><template v-if="business.deliveredQuantity > 0"> (bình quân {{ money(Number(business.revenue) / business.deliveredQuantity) }}/con)</template></p>
    </div>

    <div v-else class="view">
      <span class="label">Doanh thu theo lô · 6 tháng gần nhất · {{ TOP_LOTS }} lô cao nhất</span>
      <v-progress-linear v-if="lotsLoading" indeterminate color="primary" rounded aria-label="Đang tải doanh thu theo lô" />
      <div v-else-if="lotsError" class="error" role="alert"><span>Không tải được doanh thu theo lô: {{ lotsError }}</span><v-btn size="small" variant="text" @click="loadLots">Thử lại</v-btn></div>
      <p v-else-if="!lots?.length" class="empty">Không có lô nào được đặt hoặc giao trong 6 tháng gần nhất.</p>
      <template v-else>
        <div v-if="rankBars.length" class="rank" role="img" :aria-label="`Doanh thu theo lô: ${rankBars.map((bar) => `${bar.name} ${money(bar.revenue)}`).join('; ')}`">
          <template v-for="bar in rankBars" :key="bar.key">
            <span class="rank-name">{{ bar.name }}</span>
            <div class="rank-track"><div class="rank-fill" :style="{ width: bar.width }" /></div>
            <span class="rank-value">{{ compactMoney(bar.revenue) }}</span>
          </template>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th scope="col" class="text">Lô · ao/bể</th><th scope="col" class="text">Trạng thái lô</th><th scope="col">Số con đã đặt</th><th scope="col">Số con đã giao</th><th scope="col">Doanh thu</th><th scope="col">Đơn giá bình quân</th></tr></thead>
            <tbody>
              <tr v-for="row in lots" :key="row.batchId">
                <td class="text"><router-link :to="`/seed-batches?batchId=${row.batchId}`" class="link">{{ row.batchCode }}</router-link><template v-if="row.tank"> · {{ row.tank.code }}</template></td>
                <td class="text"><span class="tag" :class="`lot-${row.batchStatus}`">{{ batchStatusNames[row.batchStatus] || row.batchStatus }}</span></td>
                <td>{{ count(row.orderedQuantity) }}</td>
                <td>{{ count(row.deliveredQuantity) }}</td>
                <td class="strong">{{ money(row.revenue) }}</td>
                <td>{{ row.averagePrice ? `${money(row.averagePrice)}/con` : '—' }}</td>
              </tr>
              <tr class="total">
                <td class="text" colspan="3">Tổng</td>
                <td>{{ count(lotTotals.delivered) }}</td>
                <td>{{ money(lotTotals.revenue) }}</td>
                <td>{{ lotTotals.average === null ? '—' : `${money(lotTotals.average)}/con` }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="foot-note">Bấm mã lô để mở chi tiết lô. Lô đang bán dở có số con đã giao nhỏ hơn số con đã đặt.</p>
      </template>
    </div>

    <p class="disclaimer">Chi phí chỉ gồm vật tư đã xuất dùng (số lượng × đơn giá, theo ngày xuất); chưa gồm điện, nhân công và chi phí khác nên lợi nhuận là lợi nhuận gộp. Tiền nhập kho không tính là chi phí.</p>
  </section>
</template>

<style scoped>
.business { display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; min-width: 0; padding: 18px 20px; border: 1px solid #d8e6e3; border-radius: 16px; background: #fff; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
h2 { margin: 0; color: #134e4a; font-size: 15px; }
.head-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.link { color: #087f6e; font-size: 13px; font-weight: 500; text-decoration: none; }
.link:hover { text-decoration: underline; }
.link:focus-visible, .switch button:focus-visible { outline: 2px solid #087f6e; outline-offset: 2px; }
.switch { display: inline-flex; border: 1px solid #bfdcd5; border-radius: 8px; overflow: hidden; }
.switch button { min-height: 36px; padding: 0 16px; border: 0; background: #fff; color: #087f6e; font: inherit; font-size: 13px; cursor: pointer; }
.switch button + button { border-left: 1px solid #bfdcd5; }
.switch button.on { background: #087f6e; color: #fff; font-weight: 700; }

.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.tile { display: flex; flex-direction: column; gap: 4px; box-sizing: border-box; padding: 14px 16px; border: 1px solid #d8e6e3; border-radius: 16px; background: #fff; color: inherit; text-decoration: none; min-width: 0; }
.tile strong { color: #134e4a; font-size: 24px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.label { color: #5f716d; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.sub { color: #5f716d; font-size: 12px; }
.sub.accent { color: #087f6e; font-weight: 500; }
.tile.main { border-color: #9fd3c8; background: #f0f9f7; }
.tile.main strong { color: #087f6e; }
.tile.cost { border-color: #f1d58a; }
.tile.cost strong { color: #9a4a00; }
.tile.profit { border-color: #9fd3c8; }
.tile.profit strong { color: #076656; }
.link-tile:hover { box-shadow: 0 2px 10px rgba(8, 127, 110, .1); }
.link-tile:focus-visible { outline: 2px solid #087f6e; outline-offset: 2px; }

.view { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.view-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.legend { display: flex; gap: 14px; flex-wrap: wrap; color: #4f6662; font-size: 12px; }
.legend span { display: flex; align-items: center; gap: 6px; }
.swatch { display: inline-block; width: 12px; height: 12px; box-sizing: border-box; border-radius: 3px; }
.swatch.revenue { background: #087f6e; }
.swatch.collected { background: #9fd8cc; }
.swatch.current { border: 1.5px dashed #087f6e; }
.chart { display: flex; gap: 10px; }
.axis { position: relative; width: 52px; height: 150px; flex-shrink: 0; }
.axis span { position: absolute; right: 0; transform: translateY(50%); color: #5f716d; font-size: 11px; white-space: nowrap; }
.plot { position: relative; flex-grow: 1; min-width: 0; height: 150px; border-bottom: 1px solid #b9c9c4; }
.gridline { position: absolute; left: 0; right: 0; border-top: 1px dashed #e1e9e6; }
.groups { position: absolute; inset: 0; display: flex; align-items: flex-end; gap: 10px; }
.group { flex: 1 1 0; height: 100%; display: flex; justify-content: center; align-items: flex-end; gap: 4px; }
.bar { width: 34%; max-width: 26px; min-height: 1px; box-sizing: border-box; border-radius: 4px 4px 0 0; }
.bar.revenue { background: #087f6e; }
.bar.collected { background: #9fd8cc; }
.bar.current { border: 1.5px dashed #087f6e; border-bottom: 0; opacity: .6; }
.months { display: flex; gap: 10px; padding-left: 62px; }
.months span { flex: 1 1 0; text-align: center; color: #4f6662; font-size: 12px; }
.months span.current { color: #134e4a; font-weight: 700; }
.foot-line { margin: 4px 0 0; padding-top: 10px; border-top: 1px solid #edf2f0; color: #4f6662; font-size: 13px; }
.foot-line strong { color: #134e4a; }

.rank { display: grid; grid-template-columns: minmax(130px, 190px) minmax(0, 1fr) 64px; align-items: center; gap: 10px 14px; }
.rank-name { font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }
.rank-track { height: 14px; border-radius: 4px; background: #edf2f0; }
.rank-fill { height: 14px; min-width: 2px; border-radius: 4px; background: #087f6e; }
.rank-value { color: #4f6662; font-size: 13px; text-align: right; white-space: nowrap; }
.table-wrap { overflow-x: auto; }
table { width: 100%; min-width: 700px; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
th, td { padding: 9px 8px; text-align: right; border-bottom: 1px solid #edf2f0; }
th { color: #5f716d; font-size: 12px; font-weight: 700; border-bottom-color: #dce7e4; }
.text { text-align: left; }
.strong { color: #134e4a; font-weight: 700; }
tr.total td { border-bottom: 0; color: #134e4a; font-weight: 700; }
.tag { padding: 2px 8px; border-radius: 6px; background: #edf2f0; color: #4f6662; font-size: 12px; white-space: nowrap; }
.lot-active { background: #e0f3ed; color: #076656; }
.lot-ready_for_sale { background: #fff2d4; color: #7a5000; }
.lot-sold { background: #e8efff; color: #2f4f96; }
.lot-failed, .lot-cancelled { background: #fde9e7; color: #a33c34; }
.foot-note, .empty { margin: 0; color: #5f716d; font-size: 12px; }
.error { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-radius: 12px; background: #fff0ef; color: #9b3e3e; font-size: 13px; }
.disclaimer { margin: 0; padding-top: 10px; border-top: 1px solid #edf2f0; color: #5f716d; font-size: 12px; }

@media (max-width: 600px) {
  .rank { grid-template-columns: minmax(0, 1fr) auto; }
  .rank-track { display: none; }
  .axis { width: 44px; }
  .months { padding-left: 54px; }
  .months span { font-size: 10px; }
}
</style>
