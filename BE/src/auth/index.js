import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireFarmManager } from '../middlewares/auth.middleware.js'
import { revokeInvitation } from './delete.js'
import { checkInvitationEmail, getMe, listInvitations } from './get.js'
import { acceptInvitation, createInvitation, login, logout } from './post.js'

export const authRouter = Router()

authRouter.post('/login', asyncHandler(login))
authRouter.post('/logout', asyncHandler(logout))
authRouter.post('/accept-invitation', asyncHandler(acceptInvitation))
authRouter.get('/me', asyncHandler(getMe))

authRouter.get('/invitations/check-email', requireAuth, requireFarmManager, asyncHandler(checkInvitationEmail))
authRouter.get('/invitations', requireAuth, requireFarmManager, asyncHandler(listInvitations))
authRouter.post('/invitations', requireAuth, requireFarmManager, asyncHandler(createInvitation))
authRouter.delete('/invitations/:invitationId', requireAuth, asyncHandler(revokeInvitation))
