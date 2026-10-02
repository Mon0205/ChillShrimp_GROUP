const TERMINAL_BATCH_STATUSES = new Set(['sold', 'failed', 'cancelled'])

export function isSeedBatchEditable(status) {
  return !TERMINAL_BATCH_STATUSES.has(status)
}
