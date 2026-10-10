<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({ modelValue: { type: Object, required: true } })
const emit = defineEmits(['update:modelValue'])
const menu = ref(false)
const dates = ref([])
const choosingEnd = ref(false)
const day = value => {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const display = value => value.split('-').reverse().join('/')
const label = computed(() => choosingEnd.value && dates.value.length
  ? `${display(day(dates.value[0]))} – …`
  : props.modelValue.from
  ? `${display(props.modelValue.from)} – ${display(props.modelValue.to || props.modelValue.from)}`
  : '')
watch(menu, open => {
  choosingEnd.value = false
  if (open) dates.value = props.modelValue.from
    ? [new Date(`${props.modelValue.from}T00:00:00`), new Date(`${props.modelValue.to || props.modelValue.from}T00:00:00`)]
    : []
})
function select(values) {
  dates.value = values || []
  choosingEnd.value = dates.value.length === 1
  if (dates.value.length < 2) return
  const range = dates.value.map(day).sort()
  emit('update:modelValue', { ...props.modelValue, from: range[0], to: range.at(-1) })
  menu.value = false
}
function clear() {
  choosingEnd.value = false
  dates.value = []
  emit('update:modelValue', { ...props.modelValue, from: '', to: '' })
}
</script>

<template>
  <v-menu v-model="menu" :close-on-content-click="false">
    <template #activator="{ props: activator }">
      <v-text-field v-bind="activator" class="date-range" :model-value="label" label="Khoảng ngày" placeholder="Chọn khoảng ngày" prepend-inner-icon="mdi-calendar-range" readonly clearable density="compact" variant="outlined" hide-details @click:clear.stop="clear" />
    </template>
    <v-card>
      <v-date-picker :model-value="dates" multiple="range" hide-header show-adjacent-months @update:model-value="select" />
    </v-card>
  </v-menu>
</template>
