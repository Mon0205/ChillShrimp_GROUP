import { customerRouter, salesOrderRouter } from './routes/sales/sales/index.js'
import cors from 'cors'
import express from 'express'
import { authRouter } from './routes/auth/auth/index.js'
import { farmRouter } from './routes/farms/farm/index.js'
import { userRouter } from './routes/users/user/index.js'
import { areaRouter } from './routes/farms/area/index.js'
import { pondTankRouter } from './routes/farms/pond-tank/index.js'
import { seedSupplierRouter } from './routes/seed/seed-supplier/index.js'
import { seedBatchRouter } from './routes/seed/seed-batch/index.js'
import { feedingLogRouter } from './routes/care/feeding-log/index.js'
import { inventorySupplyRouter } from './routes/inventory/inventory-supply/index.js'
import { feedingReportRouter } from './routes/care/feeding-report/index.js'
import { waterChangeLogRouter } from './routes/care/water-change-log/index.js'
import { waterParameterLogRouter } from './routes/care/water-parameter-log/index.js'
import { environmentThresholdRouter } from './routes/environment/environment-threshold/index.js'
import { treatmentLogRouter } from './routes/care/treatment-log/index.js'
import { inventoryTransactionRouter } from './routes/inventory/inventory-transaction/index.js'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js'

export const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' } }))
app.use('/api/auth', authRouter)
app.use('/api/users', userRouter)
app.use('/api/farms/:farmId/customers', customerRouter)
app.use('/api/farms/:farmId/sales-orders', salesOrderRouter)
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
