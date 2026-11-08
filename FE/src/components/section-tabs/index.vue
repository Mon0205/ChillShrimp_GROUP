<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFarmContext } from '../../composables/farm-context.js'
const props = defineProps({ section: { type: String, required: true } })
const route = useRoute()
const context = useFarmContext()
const role = computed(() => context.farms.find(farm => farm.id === context.farmId)?.role)
const canViewPonds = computed(() => ['owner', 'farm_manager', 'area_manager', 'technician'].includes(role.value))
const canViewBusiness = computed(() => ['owner', 'farm_manager', 'area_manager'].includes(role.value))
</script>

<template>
  <v-tabs :model-value="route.path" color="primary" :aria-label="props.section === 'farms' ? 'Trại giống' : 'Kinh doanh'" show-arrows>
    <template v-if="props.section === 'farms'">
      <v-tab value="/farms" to="/farms">Trang trại</v-tab>
      <v-tab v-if="canViewPonds" value="/ponds-tanks" to="/ponds-tanks">Ao/bể</v-tab>
    </template>
    <template v-else-if="props.section === 'business' && canViewBusiness">
      <v-tab value="/sales-orders" to="/sales-orders">Bán giống</v-tab>
      <v-tab value="/customers" to="/customers">Khách hàng</v-tab>
    </template>
  </v-tabs>
</template>
