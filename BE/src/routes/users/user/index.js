import { Router } from 'express'
import { requireAuth } from '../../../middlewares/auth.middleware.js'

import { registerGetInvitation, registerGetProfile, registerListUsers, registerCheckInvitationEmail, registerListInvitations } from './get.js'
import { registerAcceptInvitation, registerPublicPasswordOtp, registerPublicPasswordReset, registerChangePassword, registerProfilePasswordOtp, registerProfilePasswordReset, registerCreateInvitation } from './post.js'
import { registerUpdateProfile, registerUpdateManagedUser, registerUpdateMembershipStatus } from './patch.js'
import { registerRevokeInvitation } from './delete.js'

export const userRouter = Router()

// Public onboarding endpoints accessed from the invitation email.
registerGetInvitation(userRouter)
registerAcceptInvitation(userRouter)
registerPublicPasswordOtp(userRouter)
registerPublicPasswordReset(userRouter)

userRouter.use(requireAuth)
registerGetProfile(userRouter)
registerUpdateProfile(userRouter)
registerChangePassword(userRouter)
registerProfilePasswordOtp(userRouter)
registerProfilePasswordReset(userRouter)
registerListUsers(userRouter)
registerUpdateManagedUser(userRouter)
registerUpdateMembershipStatus(userRouter)
registerCheckInvitationEmail(userRouter)
registerListInvitations(userRouter)
registerCreateInvitation(userRouter)
registerRevokeInvitation(userRouter)
