<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFarmContext } from '../../composables/farm-context.js'
const route = useRoute()
const context = useFarmContext()
const role = computed(() => context.farms.find(farm => farm.id === context.farmId)?.role)
const canViewInventory = computed(() => ['OWNER', 'FARM_MANAGER', 'WAREHOUSE_STAFF', 'AREA_MANAGER', 'TECHNICIAN'].includes(role.value))
const canViewRequests = computed(() => ['OWNER', 'FARM_MANAGER', 'WAREHOUSE_STAFF', 'AREA_MANAGER'].includes(role.value))
const canRecordInventoryUsage = computed(() => ['OWNER', 'FARM_MANAGER', 'WAREHOUSE_STAFF', 'AREA_MANAGER', 'TECHNICIAN'].includes(role.value))
</script>

<template>
  <v-tabs :model-value="route.path" color="primary" aria-label="Quản lý vật tư" show-arrows>
    <v-tab v-if="canViewInventory" value="/inventory-supplies" to="/inventory-supplies">Danh mục vật tư</v-tab>
    <v-tab v-if="canViewRequests" value="/inventory-requests" to="/inventory-requests">Yêu cầu vật tư</v-tab>
    <v-tab v-if="canRecordInventoryUsage" value="/inventory-usage" to="/inventory-usage">Lịch sử cấp vật tư</v-tab>
  </v-tabs>
</template>
