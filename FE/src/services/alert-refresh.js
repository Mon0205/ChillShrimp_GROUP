export function createAlertRefresh(refresh, { delay = 200, canRefresh = () => true } = {}) {
  let timer, running = false, disposed = false, pending = false, all = false
  let alertIds = new Set()

  function flush() {
    clearTimeout(timer)
    if (disposed || running || !pending || !canRefresh()) return
    timer = setTimeout(async () => {
      if (disposed || running || !canRefresh()) return
      const changes = { all, alertIds }
      pending = false; all = false; alertIds = new Set(); running = true
      try { await refresh(changes) }
      catch (error) { console.error('Alert refresh failed', error) }
      finally { running = false; flush() }
    }, delay)
  }

  function schedule(change) {
    if (disposed) return
    pending = true
    if (change?.alertId) alertIds.add(change.alertId)
    else all = true
    flush()
  }

  function cancel() {
    clearTimeout(timer)
    pending = false; all = false; alertIds = new Set()
  }

  return { schedule, flush, cancel, dispose() { disposed = true; cancel() } }
}
