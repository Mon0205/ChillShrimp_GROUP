import 'dotenv/config'
import { createServer } from 'node:http'
import { attachAlertSocket } from './realtime/alert-socket.js'
import { app } from './app.js'
import { prisma } from './config/prisma.js'

const port = Number(process.env.PORT || 8000)
const server = createServer(app)
const io = attachAlertSocket(server)
server.listen(port, () => console.log(`API: http://localhost:${port}`))

async function shutdown() {
  io.close(async () => { await prisma.$disconnect(); process.exit(0) })
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
