import 'dotenv/config'
import { createServer } from 'node:http'
import { attachAlertSocket } from './realtime/alert-socket.js'
import { app } from './app.js'
import { prisma } from './config/prisma.js'
import { recoverInterruptedAiInspections } from './services/seed/ai-inspection.service.js'

const port = Number(process.env.PORT || 8000)
const server = createServer(app)
const io = attachAlertSocket(server)
server.listen(port, () => {
  console.log(`API: http://localhost:${port}`)
  // Not awaited before listening: a slow or unreachable database must not delay startup or health checks.
  recoverInterruptedAiInspections()
    .then((count) => { if (count) console.log(`Reset ${count} interrupted AI inspection(s) to failed.`) })
    .catch((error) => console.error('Could not reset interrupted AI inspections:', error))
})

async function shutdown() {
  io.close(async () => { await prisma.$disconnect(); process.exit(0) })
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
