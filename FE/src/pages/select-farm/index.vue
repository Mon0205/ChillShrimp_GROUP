<script setup>
import LoadingIndicator from '../../components/loading/index.vue'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFarmContext, loadFarmContext, confirmFarmSelection } from '../../composables/farm-context.js'

const farms = useFarmContext()
const route = useRoute(), router = useRouter()
const error = ref('')
const selectedFarmId = ref('')
async function retry() {
  error.value = ''
  try {
    await loadFarmContext(true)
    if (farms.farms.length < 2) await router.replace('/dashboard')
  } catch (err) { error.value = err.message }
}
function choose() {
  if (!confirmFarmSelection(selectedFarmId.value)) return
  const target = route.query.redirect
  router.replace(typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/select-farm') ? target : '/dashboard')
}
onMounted(() => { if (!farms.ready) retry() })
</script>

<template>
<main class="farm-catalog">
    <header class="catalog-header"><strong>ChillShrimp</strong></header>
    <v-dialog :model-value="true" persistent max-width="380" aria-labelledby="select-farm-title">
    <v-card class="selection-dialog">
      <h2 id="select-farm-title">Chọn trang trại</h2>
      <LoadingIndicator v-if="farms.loading" />
      <div v-else-if="error"><p role="alert">{{ error }}</p><v-btn @click="retry">Thử lại</v-btn></div>
      <form v-else class="farm-selection" @submit.prevent="choose">
        <v-select v-model="selectedFarmId" :items="farms.farms" item-title="name" item-value="id" label="Trang trại" placeholder="Chọn tên trại" variant="outlined" hide-details />
        <v-btn type="submit" color="primary" :disabled="!selectedFarmId" block>Tiếp tục</v-btn>
      </form>
    </v-card>
    </v-dialog>
  </main>
</template>

<style scoped>
.farm-catalog { min-height: 100dvh; background: #f5f8f7; color: #134e4a; }
.catalog-header { display: flex; align-items: center; justify-content: space-between; padding: 20px clamp(20px, 5vw, 72px); border-bottom: 1px solid #dce7e4; background: #fff; }
.catalog-header strong { font-size: 22px; }
.selection-dialog { padding: 22px; border-radius: 12px !important; background: #fff; }
h2 { margin: 0; font-size: 20px; color: #134e4a; }
.farm-selection { display: grid; gap: 16px; margin-top: 20px; }
@media (max-width: 600px) { .selection-dialog { padding: 20px; } }
</style>
