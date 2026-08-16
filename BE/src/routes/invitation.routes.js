import { Router } from 'express'
import { checkEmail, createInvitation } from '../controllers/invitation.controller.js'
import { requireAuth, requireFarmManager } from '../middlewares/auth.middleware.js'
import { asyncHandler } from '../middlewares/async-handler.js'

export const invitationRouter = Router()
invitationRouter.use(requireAuth)
invitationRouter.get('/check-email', requireFarmManager, asyncHandler(checkEmail))
invitationRouter.post('/', requireFarmManager, asyncHandler(createInvitation))
