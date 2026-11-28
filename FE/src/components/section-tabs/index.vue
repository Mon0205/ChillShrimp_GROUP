<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFarmContext } from '../../composables/farm-context.js'
const props = defineProps({ section: { type: String, required: true } })
const route = useRoute()
const context = useFarmContext()
const role = computed(() => context.farms.find(farm => farm.id === context.farmId)?.role)
const canViewPonds = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'].includes(role.value))
const canViewBusiness = computed(() => ['OWNER', 'FARM_MANAGER', 'AREA_MANAGER'].includes(role.value))
const canViewRevenue = computed(() => ['OWNER', 'FARM_MANAGER'].includes(role.value))
</script>

<template>
  <v-tabs class="workspace-section-tabs" :model-value="route.path" color="primary" :aria-label="props.section === 'farms' ? 'Trại giống' : 'Kinh doanh'" show-arrows>
    <template v-if="props.section === 'farms'">
      <v-tab value="/farms" to="/farms">Trang trại</v-tab>
      <v-tab v-if="canViewPonds" value="/ponds-tanks" to="/ponds-tanks">Ao/bể</v-tab>
    </template>
    <template v-else-if="props.section === 'business' && canViewBusiness">
      <v-tab value="/sales-orders" to="/sales-orders">Bán giống</v-tab>
      <v-tab value="/customers" to="/customers">Khách hàng</v-tab>
      <v-tab v-if="canViewRevenue" value="/sales-revenue" to="/sales-revenue">Doanh thu</v-tab>
    </template>
  </v-tabs>
</template>
