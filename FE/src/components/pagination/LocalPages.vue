<script setup>
import { computed, ref, watch } from 'vue'
import Pagination from './index.vue'

const props = defineProps({ items: { type: Array, required: true } })
const page = ref(1)
const pageSize = ref(10)
watch(() => props.items, () => { page.value = 1 })
watch(pageSize, () => { page.value = 1 })

const rows = computed(() => props.items.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
</script>

<template>
  <slot :rows="rows" />
  <Pagination v-if="items.length > 10" v-model:page="page" v-model:page-size="pageSize" :total="items.length" />
</template>
