import cors from 'cors'
import express from 'express'
import { authRouter } from './auth/index.js'
import { farmRouter } from './routes/farm.routes.js'
import { userRouter } from './users/index.js'
import { areaRouter } from './routes/area.routes.js'
import { pondTankRouter } from './routes/pond-tank.routes.js'
import { seedSupplierRouter } from './routes/seed-supplier.routes.js'
import { seedBatchRouter } from './routes/seed-batch.routes.js'
import { feedingLogRouter } from './routes/feeding-log.routes.js'
import { inventorySupplyRouter } from './routes/inventory-supply.routes.js'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js'

export const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' } }))
app.use('/api/auth', authRouter)
app.use('/api/users', userRouter)
app.use('/api/farms/:farmId/areas', areaRouter)
app.use('/api/farms/:farmId/ponds-tanks', pondTankRouter)
app.use('/api/farms/:farmId/seed-suppliers', seedSupplierRouter)
app.use('/api/farms/:farmId/seed-batches', seedBatchRouter)
app.use('/api/farms/:farmId/feeding-logs', feedingLogRouter)
app.use('/api/farms/:farmId/inventory-supplies', inventorySupplyRouter)
app.use('/api/farms', farmRouter)
app.use(notFoundHandler)
app.use(errorHandler)
