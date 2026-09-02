import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { getMe } from './get.js'
import { login, logout } from './post.js'

export const authRouter = Router()
authRouter.post('/login', asyncHandler(login))
authRouter.post('/logout', asyncHandler(logout))
authRouter.get('/me', asyncHandler(getMe))
