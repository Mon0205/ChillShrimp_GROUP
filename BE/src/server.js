import 'dotenv/config'
import { app } from './app.js'
import { prisma } from './config/prisma.js'

const port = Number(process.env.PORT || 8000)
const server = app.listen(port, () => console.log(`API: http://localhost:${port}`))

async function shutdown() {
  server.close(async () => { await prisma.$disconnect(); process.exit(0) })
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
