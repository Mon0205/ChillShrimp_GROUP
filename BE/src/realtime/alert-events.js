import { EventEmitter } from 'node:events'

export const alertEvents = new EventEmitter()

// Called only after the outer transaction commits. Socket errors cannot undo a saved write.
export async function publishAlertEvents(events) {
  if (!events.length) return
  await Promise.all(alertEvents.listeners('changes').map(async listener => {
    try { await listener(events) }
    catch (error) { console.error('Alert socket delivery failed', error) }
  }))
}
