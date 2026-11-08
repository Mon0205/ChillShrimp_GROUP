import { Router } from 'express'
import { registerLogin, registerLogout } from './post.js'
import { registerGetMe } from './get.js'

export const authRouter = Router()
registerLogin(authRouter)
registerLogout(authRouter)
registerGetMe(authRouter)
