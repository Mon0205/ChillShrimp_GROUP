const running = new WeakSet()

// Ignores a call while the same action is still in progress. A disabled button does not stop the
// Enter key from submitting a form again, and validation runs before any "saving" flag is set.
export async function singleFlight(action, ...args) {
  if (running.has(action)) return
  running.add(action)
  try {
    return await action(...args)
  } finally {
    running.delete(action)
  }
}
