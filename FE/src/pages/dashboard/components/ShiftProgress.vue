<script setup>
import { computed } from 'vue'

// How far today's shift has got: tanks fed today and tanks whose water was measured in the last 24 hours.
const props = defineProps({ progress: { type: Object, required: true } })
const bars = computed(() => {
  const { tanks, fed, waterChecked } = props.progress
  const width = (done) => (tanks > 0 ? `${Math.round((done / tanks) * 100)}%` : '0%')
  return [
    { key: 'fed', text: `Cho ăn ${fed}/${tanks} ao`, width: width(fed), color: '#087f6e' },
    { key: 'water', text: `Đo nước ${waterChecked}/${tanks} ao`, width: width(waterChecked), color: '#e08a00' },
  ]
})
</script>

<template>
  <div class="progress" role="status" aria-label="Tiến độ ca hôm nay">
    <strong class="title">Tiến độ ca hôm nay</strong>
    <div v-for="bar in bars" :key="bar.key" class="row">
      <span class="text">{{ bar.text }}</span>
      <div class="track" aria-hidden="true"><div class="fill" :style="{ width: bar.width, background: bar.color }" /></div>
    </div>
  </div>
</template>

<style scoped>
.progress { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; box-sizing: border-box; padding: 12px 16px; border: 1px solid #d8e6e3; border-radius: 16px; background: #fff; }
.title { color: #134e4a; font-size: 13px; }
.row { display: flex; align-items: center; gap: 8px; flex: 1 1 220px; }
.text { color: #4f6662; font-size: 12px; white-space: nowrap; }
.track { flex-grow: 1; height: 10px; border-radius: 5px; background: #edf2f0; }
.fill { height: 10px; border-radius: 5px; }
</style>
