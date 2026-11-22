<script setup>
import { computed } from 'vue'

// Open alerts per active area, busiest first, so it is clear where to put people.
const props = defineProps({ areas: { type: Array, default: () => [] } })
const max = computed(() => Math.max(1, ...props.areas.map((area) => area.open)))
</script>

<template>
  <section class="panel" aria-labelledby="alerts-by-area-heading">
    <div class="head">
      <h2 id="alerts-by-area-heading">Cảnh báo đang mở theo khu vực</h2>
      <router-link to="/alerts" class="link">Mở trang Cảnh báo →</router-link>
    </div>
    <p v-if="!areas.length" class="empty">Trại chưa có khu vực đang hoạt động.</p>
    <div v-else class="bars">
      <template v-for="area in areas" :key="area.areaId || 'none'">
        <span class="name">{{ area.name }}</span>
        <div class="track" aria-hidden="true"><div class="fill" :style="{ width: `${(area.open / max) * 100}%` }" /></div>
        <span class="num">{{ area.open }}<template v-if="area.critical"> · <strong class="danger">{{ area.critical }} nguy hiểm</strong></template></span>
      </template>
    </div>
  </section>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 12px; box-sizing: border-box; min-width: 0; padding: 18px 20px; border: 1px solid #dce7e4; border-radius: 12px; background: #fff; }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
h2 { margin: 0; color: #134e4a; font-size: 15px; }
.link { color: #087f6e; font-size: 13px; font-weight: 500; text-decoration: none; }
.link:hover { text-decoration: underline; }
.link:focus-visible { outline: 2px solid #087f6e; outline-offset: 2px; }
.empty { margin: 0; color: #5f716d; font-size: 13px; }
.bars { display: grid; grid-template-columns: minmax(120px, 200px) minmax(0, 1fr) 130px; align-items: center; gap: 10px 14px; }
.name { font-size: 14px; font-weight: 500; overflow-wrap: anywhere; }
.track { height: 14px; border-radius: 4px; background: #edf2f0; }
.fill { height: 14px; border-radius: 4px; background: #087f6e; }
.num { color: #4f6662; font-size: 13px; }
.danger { color: #b3261e; }
@media (max-width: 520px) { .bars { grid-template-columns: 1fr; } .track { display: none; } }
</style>
