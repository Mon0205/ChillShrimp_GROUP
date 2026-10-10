import cors from 'cors'
import { customerRouter } from './routes/customer.routes.js'
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
import { feedingReportRouter } from './routes/feeding-report.routes.js'
import { waterChangeLogRouter } from './routes/water-change-log.routes.js'
import { waterParameterLogRouter } from './routes/water-parameter-log.routes.js'
import { environmentThresholdRouter } from './routes/environment-threshold.routes.js'
import { treatmentLogRouter } from './routes/treatment-log.routes.js'
import { inventoryTransactionRouter } from './routes/inventory-transaction.routes.js'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js'

export const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' } }))
app.use('/api/auth', authRouter)
app.use('/api/users', userRouter)
app.use('/api/farms/:farmId/customers', customerRouter)
app.use('/api/farms/:farmId/areas', areaRouter)
app.use('/api/farms/:farmId/ponds-tanks', pondTankRouter)
app.use('/api/farms/:farmId/seed-suppliers', seedSupplierRouter)
app.use('/api/farms/:farmId/seed-batches', seedBatchRouter)
app.use('/api/farms/:farmId/feeding-logs', feedingLogRouter)
app.use('/api/farms/:farmId/water-change-logs', waterChangeLogRouter)
app.use('/api/farms/:farmId/water-parameter-logs', waterParameterLogRouter)
app.use('/api/farms/:farmId/environment-thresholds', environmentThresholdRouter)
app.use('/api/farms/:farmId/treatment-logs', treatmentLogRouter)
app.use('/api/farms/:farmId/inventory-supplies', inventorySupplyRouter)
app.use('/api/farms/:farmId/inventory-transactions', inventoryTransactionRouter)
app.use('/api/farms/:farmId/reports', feedingReportRouter)
app.use('/api/farms', farmRouter)
app.use(notFoundHandler)
app.use(errorHandler)
