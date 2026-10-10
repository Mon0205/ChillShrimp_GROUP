import { reactive } from 'vue'
import { api } from '../services/api.js'

const farmContext = reactive({ farms: [], farmId: localStorage.getItem('selectedFarmId') || '', loading: false, ready: false, selectionRequired: sessionStorage.getItem('farmSelectionRequired') === 'true' || !localStorage.getItem('selectedFarmId') })
let pendingLoad = null
let generation = 0

export function loadFarmContext(force = false) {
  if (pendingLoad) return pendingLoad
  if (farmContext.ready && !force) return Promise.resolve()
  const currentGeneration = generation
  farmContext.loading = true
  pendingLoad = (async () => {
    try {
      const result = await api('/farms')
      if (currentGeneration !== generation) return
      farmContext.farms = result.data
      if (!farmContext.farms.some((farm) => farm.id === farmContext.farmId)) farmContext.farmId = farmContext.farms[0]?.id || ''
      if (farmContext.farmId) localStorage.setItem('selectedFarmId', farmContext.farmId)
      else localStorage.removeItem('selectedFarmId')
      farmContext.ready = true
    } finally {
      if (currentGeneration === generation) { farmContext.loading = false; pendingLoad = null }
    }
  })()
  return pendingLoad
}

export function resetFarmContext() {
  generation += 1
  pendingLoad = null
  Object.assign(farmContext, { farms: [], farmId: '', loading: false, ready: false })
  farmContext.selectionRequired = true
  sessionStorage.setItem('farmSelectionRequired', 'true')
  localStorage.removeItem('selectedFarmId')
}

export function selectFarm(farmId) {
  farmContext.farmId = farmId || ''
  if (farmContext.farmId) localStorage.setItem('selectedFarmId', farmContext.farmId)
  else localStorage.removeItem('selectedFarmId')
}

export function useFarmContext() { return farmContext }

export function confirmFarmSelection(farmId) {
  if (!farmContext.farms.some(farm => farm.id === farmId)) return false
  selectFarm(farmId)
  farmContext.selectionRequired = false
  sessionStorage.removeItem('farmSelectionRequired')
  return true
}
