import { Router } from 'express'
import { acceptInvitation, login, me } from '../controllers/auth.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { asyncHandler } from '../middlewares/async-handler.js'

export const authRouter = Router()
authRouter.post('/login', asyncHandler(login))
authRouter.get('/me', requireAuth, asyncHandler(me))
authRouter.post('/accept-invitation', asyncHandler(acceptInvitation))
