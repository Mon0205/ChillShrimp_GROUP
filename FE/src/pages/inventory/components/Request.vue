<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { selectFarm, useFarmContext } from '../../../composables/farm-context.js'
import { showToast } from '../../../composables/toast.js'
import { api } from '../../../services/api.js'

const emit = defineEmits(['close'])
const farmContext = useFarmContext()
const farms = ref([])
const supplies = ref([])
const areas = ref([])
const requests = ref([])
const loading = ref(true)
const submitting = ref(false)
const formRef = ref(null)
const form = ref({ supplyId: '', areaId: '', quantity: '', notes: '' })
const farmId = computed({ get: () => farmContext.farmId, set: selectFarm })
const role = computed(() => farms.value.find((farm) => farm.id === farmId.value)?.role || '')
const canCreate = computed(() => ['owner', 'area_manager'].includes(role.value))
const hasStockRoles = computed(() => ['owner', 'area_manager', 'warehouse_staff'].includes(role.value))
const positiveQuantity = (value) => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 999_999_999.999 && Math.abs(Number(value) * 1000 - Math.round(Number(value) * 1000)) < 1e-7 || 'Số lượng phải lớn hơn 0, tối đa 3 chữ số thập phân.'
const required = (value) => Boolean(value) || 'Trường này là bắt buộc.'

function farmUrl(path) { return `/farms/${encodeURIComponent(farmId.value)}${path}` }
function quantity(value) { return Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 }) }
function dateTime(value) { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }

async function load() {
  loading.value = true
  try {
    farms.value = (await api('/farms')).data
    farmContext.farms = farms.value
    farmContext.ready = true
    if (!farms.value.some((farm) => farm.id === farmId.value)) selectFarm(farms.value[0]?.id || '')
    await loadFarmData()
  } catch (error) { showToast(error.message, 'error') }
  finally { loading.value = false }
}

async function loadFarmData() {
  requests.value = []
  supplies.value = []
  areas.value = []
  if (!farmId.value || !hasStockRoles.value) return
  const [requestResult, supplyResult] = await Promise.all([
    api(farmUrl('/inventory-transactions/requests?limit=100')),
    canCreate.value ? api(farmUrl('/inventory-supplies?limit=100')) : Promise.resolve({ data: { items: [] } }),
  ])
  requests.value = requestResult.data.items
  supplies.value = supplyResult.data.items
  if (canCreate.value) areas.value = (await api(farmUrl('/areas'))).data
  if (!form.value.supplyId) form.value.supplyId = supplies.value[0]?.id || ''
  if (role.value === 'owner' && !form.value.areaId) form.value.areaId = areas.value[0]?.id || ''
}

async function submit() {
  const result = await formRef.value?.validate()
  if (!result?.valid) return
  if (form.value.notes.length > 4000) return showToast('Ghi chú tối đa 4.000 ký tự.', 'error')
  submitting.value = true
  try {
    await api(farmUrl('/inventory-transactions/requests'), {
      method: 'POST',
      body: JSON.stringify({ supplyId: form.value.supplyId, areaId: form.value.areaId || null, quantity: Number(form.value.quantity), notes: form.value.notes.trim() || null }),
    })
    form.value = { supplyId: supplies.value[0]?.id || '', areaId: role.value === 'owner' ? areas.value[0]?.id || '' : '', quantity: '', notes: '' }
    showToast('Đã gửi yêu cầu cấp vật tư.', 'success')
    await loadFarmData()
  } catch (error) { showToast(error.message, 'error') }
  finally { submitting.value = false }
}

watch(farmId, () => { form.value = { supplyId: '', areaId: '', quantity: '', notes: '' }; loadFarmData().catch((error) => showToast(error.message, 'error')) })
onMounted(load)
</script>
<template><v-card class="form-card"><v-card-title>Yêu cầu cấp vật tư</v-card-title><v-card-text><v-progress-circular v-if="loading" indeterminate color="primary" /><div v-else><v-form ref="formRef" @submit.prevent="submit">
            <div class="form-grid">
              <v-select v-model="form.supplyId" :items="supplies" item-title="name" item-value="id" label="Vật tư *" :rules="[required]" />
              <v-select v-if="role === 'owner'" v-model="form.areaId" :items="areas" item-title="name" item-value="id" label="Khu vực" clearable />
              <v-text-field v-model="form.quantity" type="number" min="0.001" step="0.001" label="Số lượng *" :rules="[required, positiveQuantity]" />
              <v-textarea v-model="form.notes" label="Ghi chú" rows="1" maxlength="4000" counter="4000" />
              <v-btn color="primary" prepend-icon="mdi-send-outline" :loading="submitting" @click="submit">Gửi yêu cầu</v-btn>
            </div>
          </v-form></div></v-card-text><v-card-actions><v-spacer /><v-btn :disabled="submitting" @click="emit('close')">Đóng</v-btn></v-card-actions></v-card></template>
<style scoped>.form-grid { display: grid; gap: 12px; }</style>
