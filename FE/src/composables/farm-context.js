import { reactive } from 'vue'
import { api } from '../services/api.js'

const farmContext = reactive({ farms: [], farmId: localStorage.getItem('selectedFarmId') || '', loading: false, ready: false })

export async function loadFarmContext(force = false) {
  if ((farmContext.ready && !force) || farmContext.loading) return
  farmContext.loading = true
  try {
    farmContext.farms = (await api('/farms')).data
    if (!farmContext.farms.some((farm) => farm.id === farmContext.farmId)) farmContext.farmId = farmContext.farms[0]?.id || ''
    if (farmContext.farmId) localStorage.setItem('selectedFarmId', farmContext.farmId)
    else localStorage.removeItem('selectedFarmId')
    farmContext.ready = true
  } finally { farmContext.loading = false }
}

export function selectFarm(farmId) {
  farmContext.farmId = farmId || ''
  if (farmContext.farmId) localStorage.setItem('selectedFarmId', farmContext.farmId)
  else localStorage.removeItem('selectedFarmId')
}

export function useFarmContext() { return farmContext }
