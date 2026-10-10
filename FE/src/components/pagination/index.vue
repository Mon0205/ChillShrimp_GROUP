<script setup>
import { computed } from 'vue'
const props = defineProps({
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  total: { type: Number, default: 0 },
  loading: Boolean,
  sizes: { type: Array, default: () => [10, 25, 50, 100] },
})
const emit = defineEmits(['update:page', 'update:pageSize'])
const count = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const start = computed(() => props.total ? (props.page - 1) * props.pageSize + 1 : 0)
const end = computed(() => Math.min(props.page * props.pageSize, props.total))
</script>

<template>
  <div class="app-pagination">
    <div class="page-size"><span>Số dòng</span><v-select :model-value="pageSize" :items="sizes" :disabled="loading" density="compact" variant="outlined" hide-details aria-label="Số dòng mỗi trang" @update:model-value="emit('update:pageSize', $event)" /></div>
    <span class="page-range" aria-live="polite">{{ start }}–{{ end }} / {{ total }}</span>
    <div class="page-buttons">
      <v-btn icon="mdi-page-first" variant="text" size="small" aria-label="Trang đầu" :disabled="loading || page <= 1" @click="emit('update:page', 1)" />
      <v-btn icon="mdi-chevron-left" variant="text" size="small" aria-label="Trang trước" :disabled="loading || page <= 1" @click="emit('update:page', page - 1)" />
      <v-btn icon="mdi-chevron-right" variant="text" size="small" aria-label="Trang sau" :disabled="loading || page >= count" @click="emit('update:page', page + 1)" />
      <v-btn icon="mdi-page-last" variant="text" size="small" aria-label="Trang cuối" :disabled="loading || page >= count" @click="emit('update:page', count)" />
    </div>
  </div>
</template>

<style scoped>
.app-pagination { display:flex; align-items:center; justify-content:flex-end; flex-wrap:wrap; gap:20px; padding:16px; width:100%; box-sizing:border-box; color:#60756f; font-size:13px; }
.page-size { display:flex; align-items:center; gap:12px; }
.page-size .v-select { width:90px; flex:none; }
.page-range { white-space:nowrap; }
.page-buttons { display:flex; gap:4px; }
@media(max-width:600px) { .app-pagination { gap:12px; } .page-size { margin-right:auto; } }
</style>
