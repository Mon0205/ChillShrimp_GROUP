import { Router } from 'express'
import { asyncHandler } from '../middlewares/async-handler.js'
import { requireAuth, requireFarmManager } from '../middlewares/auth.middleware.js'
import { revokeInvitation } from './delete.js'
import { checkInvitationEmail, getInvitation, getProfile, listInvitations, listUsers } from './get.js'
import { acceptInvitation, createInvitation } from './post.js'
import { updateManagedUser, updateMembershipStatus, updateProfile } from './patch.js'
import { changePassword, requestPasswordOtp, resetPasswordWithOtp } from './password.js'

export const userRouter = Router()

// Public onboarding endpoints accessed from the invitation email.
userRouter.get('/invitation/:token', asyncHandler(getInvitation))
userRouter.post('/accept-invitation', asyncHandler(acceptInvitation))
userRouter.post('/password-otp', asyncHandler(requestPasswordOtp))
userRouter.post('/password-otp/reset', asyncHandler(resetPasswordWithOtp))

userRouter.use(requireAuth)
userRouter.get('/me', asyncHandler(getProfile))
userRouter.patch('/me', asyncHandler(updateProfile))
userRouter.post('/me/change-password', asyncHandler(changePassword))
userRouter.post('/me/password-otp', asyncHandler(requestPasswordOtp))
userRouter.post('/me/password-otp/reset', asyncHandler(resetPasswordWithOtp))
userRouter.get('/', requireFarmManager, asyncHandler(listUsers))
userRouter.patch('/:userId', requireFarmManager, asyncHandler(updateManagedUser))
userRouter.patch('/:userId/status', requireFarmManager, asyncHandler(updateMembershipStatus))
userRouter.get('/invitations/check-email', requireFarmManager, asyncHandler(checkInvitationEmail))
userRouter.get('/invitations', requireFarmManager, asyncHandler(listInvitations))
userRouter.post('/invitations', requireFarmManager, asyncHandler(createInvitation))
userRouter.delete('/invitations/:invitationId', asyncHandler(revokeInvitation))
