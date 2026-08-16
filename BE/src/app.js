import cors from 'cors'
import express from 'express'
import { authRouter } from './auth/index.js'
import { farmRouter } from './routes/farm.routes.js'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js'

export const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' } }))
app.use('/api/auth', authRouter)
app.use('/api/farms', farmRouter)
app.use(notFoundHandler)
app.use(errorHandler)
