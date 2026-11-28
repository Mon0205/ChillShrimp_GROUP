// Isolated browser fixture: no real Neon calls or database writes.
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
const requireBE = createRequire(new URL('../package.json', import.meta.url))
const requireFE = createRequire(new URL('../../FE/package.json', import.meta.url))
const express = requireBE('express')
process.env.NEON_AUTH_URL = 'https://test.invalid/auth'
process.env.NEON_AUTH_COOKIE_SECRET = 'test-cookie-secret-at-least-32-characters'
process.env.FRONTEND_URL = 'http://127.0.0.1:43173'
process.env.VITE_API_URL = '/api'
process.env.VITE_PROXY_TARGET = 'http://127.0.0.1:43273'
const { neonAuth } = await import('../src/config/neon-auth.js')
const { createExpressRequestContext } = await import('../src/middlewares/auth-context.js')
const { setPrismaClientForTests } = await import('../src/config/prisma.js')
const { attachAlertSocket } = await import('../src/realtime/alert-socket.js')
const { publishAlertEvents, alertEvents } = await import('../src/realtime/alert-events.js')
const { createServer: createVite } = await import(pathToFileURL(requireFE.resolve('vite')).href)
const farmId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', farmB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const alertId = '11111111-1111-4111-8111-111111111111', tankId = '22222222-2222-4222-8222-222222222222'
const noteId = '33333333-3333-4333-8333-333333333333'
const members = new Map(['owner','worker','other'].map(userId => [userId, { userId, farmId, status: 'active', role: userId === 'owner' ? 'OWNER' : 'TECHNICIAN', areaId: userId === 'other' ? 'area-b' : 'area-a', farm: { status: 'active' } }]))
const userFromCookie = cookies => cookies?.match(/(?:^|;\s*)user=([^;]+)/)?.[1]
const user = id => ({ id, email: `${id}@test.invalid`, displayName: id, sessionExpiresAt: new Date(Date.now()+3600000).toISOString() })
neonAuth.getSession = async () => {
  const id = userFromCookie(await createExpressRequestContext().getCookies())
  return members.has(id) ? { data: { user: user(id), session: { id: `s-${id}`, createdAt: new Date(Date.now()-60000), expiresAt: new Date(Date.now()+3600000) } }, error: null } : { data: null, error: { status: 401 } }
}
let alert, reads, personalReads, counts, saveDelay, listDelay, lookupFailure = false, omitEvents = false
function reset() {
  alert = { id: alertId, farmId, tankId, alertType: 'environment_threshold', title: 'pH nguy hiểm', message: 'Bể 1: pH vượt ngưỡng', severity: 'critical', status: 'in_progress', observedValue: 11, parameterCode: 'ph', createdAt: '2026-11-21T09:00:00Z', assignmentVersion: 1, responsibleUserId: 'worker', responsibleUser: user('worker'), assignedAt: '2026-11-21T09:01:00Z', acceptedAt: '2026-11-21T09:02:00Z', tank: { id: tankId, code: 'T1', name: 'Bể 1', areaId: 'area-a' }, threshold: { unit: '', warningMin: 7, warningMax: 9, dangerMin: 6, dangerMax: 10 }, sourceLog: { recordedAt: '2026-11-21T09:00:00Z', measurementMethod: 'manual' } }
  reads = new Set(); personalReads = new Set(); counts = {}; saveDelay = 0; listDelay = 0; lookupFailure = false; omitEvents = false
}
reset()
setPrismaClientForTests({
  farmMember: { findMany: async ({where}) => members.has(where.userId) ? [members.get(where.userId)] : [], findUnique: async ({where}) => [''+farmId,''+farmB].includes(where.farmId_userId.farmId) ? members.get(where.farmId_userId.userId) : null },
  alertNotification: { findMany: async () => { if (lookupFailure) { lookupFailure = false; throw new Error('simulated socket lookup outage') }; return [structuredClone(alert)] } },
})
const app = express(); app.use(express.json())
const server = createServer(app), io = attachAlertSocket(server)
const send = (res, data) => res.json({ data })
const publish = (event, id) => publishAlertEvents([{ event, farmId, alertId, ...(id ? { userId: id } : {}) }])
app.post('/__test/reset', (_req,res) => { reset(); res.json({ok:true}) })
app.get('/__test/state', (_req,res) => res.json({ counts, connections: io.of('/').sockets.size, notes: alert.handlingNotes, status: alert.status }))
app.post('/__test/change', async (req,res) => {
  Object.assign(alert, req.body.alert || {})
  if (req.body.lookupFailure) lookupFailure = true
  if (req.body.saveDelay !== undefined) saveDelay = req.body.saveDelay
  if (req.body.listDelay !== undefined) listDelay = req.body.listDelay
  if (req.body.omitEvents !== undefined) omitEvents = req.body.omitEvents
  if (req.body.expire) alertEvents.emit('session:ended', 's-worker')
  if (req.body.disconnect) for (const socket of io.of('/').sockets.values()) socket.conn.close()
  else if (req.body.event) await publishAlertEvents(Array.from({length:req.body.burst || 1}, () => ({ event: req.body.event, farmId: req.body.farmId || farmId, alertId, ...(req.body.userId ? {userId:req.body.userId} : {}) })))
  res.json({ok:true})
})
app.use('/api', (req,_res,next) => { const id=userFromCookie(req.headers.cookie); req.userId=id; const key=`${id}:${req.method}:${req.path}`; counts[key]=(counts[key]||0)+1; next() })
app.get('/api/auth/me', (req,res) => members.has(req.userId) ? send(res,user(req.userId)) : res.status(401).json({message:'Expired'}))
app.post('/api/auth/logout', (_req,res) => send(res,{signedOut:true}))
app.get('/api/farms', (req,res) => send(res,[{id:farmId,name:'Trại A',role:members.get(req.userId)?.role,area:{id:'area-a'}},{id:farmB,name:'Trại B',role:members.get(req.userId)?.role,area:{id:'area-a'}}]))
app.get('/api/farms/:farmId/ponds-tanks', (_req,res) => send(res,[alert.tank]))
app.get('/api/farms/:farmId/areas', (_req,res) => send(res,[{id:'area-a',name:'Khu A'}]))
const root='/api/farms/:farmId/environment-thresholds'
const serialized = id => ({...structuredClone(alert),isRead:reads.has(id),readAt:reads.has(id)?new Date().toISOString():null})
app.get(`${root}/alerts`, async (req,res) => {
  const snapshot = req.params.farmId === farmId ? [serialized(req.userId)] : []
  const items = snapshot.filter(item => (!req.query.isRead || String(item.isRead)===req.query.isRead) && (!req.query.status || item.status===req.query.status) && (!req.query.severity || item.severity===req.query.severity))
  const delay=listDelay; if(delay) await new Promise(resolve=>setTimeout(resolve,delay))
  const open=snapshot.filter(item=>item.status!=='resolved')
  const summary={pending:open.filter(item=>item.status==='open').length,critical:open.filter(item=>item.severity==='critical').length,inProgress:open.filter(item=>item.status==='in_progress').length,unassigned:open.filter(item=>!item.responsibleUserId).length}
  send(res,{items,summary,unreadCount:snapshot.filter(item=>!item.isRead).length,pagination:{total:items.length,page:1,limit:Number(req.query.limit||10)}})
})
app.get(`${root}/alerts/:id`, (req,res) => send(res,serialized(req.userId)))
app.get(`${root}/alerts/:id/assignees`, (_req,res) => send(res,{items:[user('worker'),user('other')]}))
app.patch(`${root}/alerts/:id/read`, async (req,res) => { reads.add(req.userId); if(!omitEvents) await publish('alert:read',req.userId); send(res,{id:alertId,isRead:true,readAt:new Date().toISOString()}) })
app.patch(`${root}/alerts/:id/status`, async (req,res) => {
  if(saveDelay) await new Promise(resolve=>setTimeout(resolve,saveDelay))
  if(req.body.assignmentVersion!==alert.assignmentVersion) return res.status(409).json({message:'Phân công đã thay đổi; vui lòng tải lại.'})
  Object.assign(alert,{status:req.body.status,handlingNotes:req.body.notes,assignmentVersion:alert.assignmentVersion+1})
  if(!omitEvents) await publish('alert:updated')
  send(res,serialized(req.userId))
})
app.get(`${root}/notifications`, (req,res) => {
  const items=req.userId===alert.responsibleUserId && req.params.farmId===farmId ? [{id:noteId,alertId,title:'Bạn được giao xử lý cảnh báo',message:alert.title,isRead:personalReads.has(req.userId),alert:serialized(req.userId)}] : []
  send(res,{items,unreadCount:items.filter(item=>!item.isRead).length,pagination:{total:items.length,page:1,limit:5}})
})
app.patch(`${root}/notifications/:id/read`, async (req,res) => { personalReads.add(req.userId); if(!omitEvents) await publish('notification:read',req.userId); send(res,{id:noteId,isRead:true,readAt:new Date().toISOString()}) })
await new Promise(resolve=>server.listen(43273,'0.0.0.0',resolve))
const vite=await createVite({root:fileURLToPath(new URL('../../FE',import.meta.url)),server:{host:'0.0.0.0',port:43173,strictPort:true},logLevel:'warn'})
await vite.listen()
console.log('REALTIME_BROWSER_FIXTURE_READY')
async function stop() { await vite.close(); await io.close(); process.exit(0) }
process.once('SIGTERM',stop); process.once('SIGINT',stop)
