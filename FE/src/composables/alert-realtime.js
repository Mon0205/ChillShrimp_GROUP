import { onBeforeUnmount, toValue, watch } from 'vue'
import { subscribeAlertChanges } from '../services/alert-socket.js'
import { createAlertRefresh } from '../services/alert-refresh.js'

export function useAlertRealtime({ farmId, enabled, busy, refresh }) {
  const queue = createAlertRefresh(refresh, {
    canRefresh: () => Boolean(toValue(enabled) && toValue(farmId)) && !document.hidden && !toValue(busy),
  })
  const unsubscribe = subscribeAlertChanges(change => {
    if (!toValue(enabled)) return
    if (change.event === 'connect') queue.schedule()
    else if (change.farmId === toValue(farmId)) queue.schedule(change)
  })
  const refreshAll = () => { if (toValue(enabled)) queue.schedule() }
  const resume = () => { if (!document.hidden) refreshAll() }
  watch([() => toValue(farmId), () => toValue(enabled)], () => queue.cancel(), { flush: 'sync' })
  watch(() => toValue(busy), () => queue.flush(), { flush: 'post' })
  window.addEventListener('alerts:refresh', refreshAll)
  document.addEventListener('visibilitychange', resume)
  onBeforeUnmount(() => {
    unsubscribe(); queue.dispose()
    window.removeEventListener('alerts:refresh', refreshAll)
    document.removeEventListener('visibilitychange', resume)
  })
}
