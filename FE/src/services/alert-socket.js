import { io } from 'socket.io-client'
import { baseUrl } from './api.js'

const subscribers = new Set()
const events = ['alert:created', 'alert:updated', 'alert:read', 'notification:created', 'notification:read']
let socket, userId, retryTimer

export function setAlertSocketUser(nextUserId) {
  if (userId === nextUserId) return
  userId = nextUserId
  clearTimeout(retryTimer)
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = undefined
  if (!nextUserId) return

  const origin = new URL(baseUrl, window.location.origin).origin
  const current = socket = io(origin, { withCredentials: true, autoConnect: false })
  const notify = change => {
    if (socket !== current) return
    for (const listener of subscribers) listener(change)
  }
  const retry = () => {
    if (socket !== current || current.active) return
    clearTimeout(retryTimer)
    retryTimer = setTimeout(() => { if (socket === current) current.connect() }, 3000)
  }
  const expire = () => {
    if (socket !== current) return
    setAlertSocketUser(null)
    window.dispatchEvent(new Event('auth:session-expired'))
  }
  for (const event of events) current.on(event, payload => notify({ ...payload, event }))
  current.on('connect', () => notify({ event: 'connect' }))
  current.on('session:expired', expire)
  current.on('connect_error', error => [401, 403].includes(error.data?.status) ? expire() : retry())
  current.on('disconnect', retry)
  current.connect()
}

export function subscribeAlertChanges(listener) {
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}
