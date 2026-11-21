import express from 'express'
import { Server } from 'socket.io'
import { prisma } from '../config/prisma.js'
import { withAuthContext } from '../middlewares/auth-context.js'
import { readNeonSession } from '../services/auth/auth.service.js'
import { accountAccess } from '../services/auth/account-access.service.js'
import { loadMembership } from '../services/users/membership.service.js'
import { eligibleMembership, eligibleAlertWorker } from '../services/environment/alert-responsibility.service.js'
import { alertEvents } from './alert-events.js'

export function attachAlertSocket(server) {
  const origin = process.env.FRONTEND_URL || 'http://localhost:5173'
  const io = new Server(server, {
    cors: { origin, credentials: true },
    allowRequest: (req, done) => done(null, !req.headers.origin || req.headers.origin === origin),
    serveClient: false,
  })

  io.engine.use(async (req, res, next) => {
    if (req._query.sid !== undefined) return next()
    // Preserve Engine.IO's WebSocket response prototype; only adapt what Neon needs.
    const request = { headers: req.headers, protocol: req.socket.encrypted ? 'https' : 'http', get: express.request.get }
    const headers = new Map()
    let handshakeComplete = false
    const response = {
      req: request,
      getHeader: name => headers.get(name.toLowerCase()),
      setHeader: (name, value) => {
        headers.set(name.toLowerCase(), value)
        if (!handshakeComplete) res.setHeader(name.toLowerCase(), value)
      },
      cookie: express.response.cookie, append: express.response.append,
      get: express.response.get, set: express.response.set,
    }
    req.alertContext = { request, response }
    try {
      req.alertSession = await withAuthContext(request, response, () => readNeonSession())
      await accountAccess(req.alertSession.user)
    } catch (error) { req.alertAuthError = error }
    handshakeComplete = true
    next()
  })
  io.use((socket, next) => {
    const error = socket.request.alertAuthError
    if (error || !socket.request.alertSession) {
      const rejected = new Error('Không thể xác thực kết nối realtime.')
      rejected.data = { status: error?.status || 401 }
      return next(rejected)
    }
    socket.data.session = socket.request.alertSession
    next()
  })

  function endSession(socket) {
    socket.emit('session:expired')
    socket.disconnect(true)
  }

  io.on('connection', socket => {
    socket.join(`user:${socket.data.session.user.id}`)
    const remaining = new Date(socket.data.session.sessionExpiresAt).getTime() - Date.now()
    const expiry = setTimeout(() => endSession(socket), Math.max(0, remaining))
    expiry.unref()
    socket.on('disconnect', () => clearTimeout(expiry))
  })

  async function deliver(events) {
    if (!io.of('/').sockets.size) return
    let alerts
    try {
      alerts = await prisma.alertNotification.findMany({
        where: { id: { in: [...new Set(events.map(item => item.alertId))] } },
        select: { id: true, farmId: true, responsibleUserId: true, tank: { select: { areaId: true } } },
      })
    } catch (error) {
      // Reconnect triggers an API reload, recovering the invalidation we could not deliver.
      io.disconnectSockets(true)
      throw error
    }
    const byId = new Map(alerts.map(alert => [alert.id, alert]))
    await Promise.all([...io.of('/').sockets.values()].map(async socket => {
      const userId = socket.data.session.user.id
      const relevant = events.filter(item => !item.userId || item.userId === userId)
      if (!relevant.length) return
      try {
        // Read-only validation avoids trying to refresh cookies on an established WebSocket.
        const { request, response } = socket.request.alertContext
        const session = await withAuthContext(request, response, () => readNeonSession({ readOnly: true }))
        if (session.user.id !== userId) return endSession(socket)
        await accountAccess(session.user)
        const memberships = new Map()
        for (const item of relevant) {
          const alert = byId.get(item.alertId)
          if (!socket.connected || !alert || alert.farmId !== item.farmId) continue
          if (!memberships.has(item.farmId)) {
            let member = null
            try { member = await loadMembership({ farmId: item.farmId, actor: session.user }) }
            catch (error) { if (![403, 404, 409].includes(error.status)) throw error }
            // Rooms reflect current rights; delivery also checks the exact alert below.
            for (const room of socket.rooms) if (room.startsWith(`farm:${item.farmId}:`)) socket.leave(room)
            if (member && eligibleMembership(member, member.areaId)) {
              socket.join(`farm:${item.farmId}:${['OWNER', 'FARM_MANAGER'].includes(member.role) ? 'all' : `area:${member.areaId}`}`)
            }
            memberships.set(item.farmId, member)
          }
          const member = memberships.get(item.farmId)
          if (!eligibleMembership(member, alert.tank?.areaId)) continue
          if (item.event.startsWith('notification:') &&
            (alert.responsibleUserId !== userId || !eligibleAlertWorker(member, alert.tank?.areaId))) continue
          if (socket.connected) socket.emit(item.event, {
            farmId: item.farmId, alertId: item.alertId,
            ...(item.notificationId ? { notificationId: item.notificationId } : {}),
          })
        }
      } catch (error) {
        if ([401, 403].includes(error.status)) endSession(socket)
        else {
          console.error('Alert socket authorization failed', error)
          socket.disconnect(true)
        }
      }
    }))
  }

  const logout = sessionId => {
    for (const socket of io.of('/').sockets.values()) {
      if (socket.data.session.session?.id === sessionId) endSession(socket)
    }
  }
  alertEvents.on('changes', deliver)
  alertEvents.on('session:ended', logout)
  server.once('close', () => {
    alertEvents.off('changes', deliver)
    alertEvents.off('session:ended', logout)
  })
  return io
}
