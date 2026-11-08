export const ENVIRONMENT_ROLES = ['owner', 'farm_manager', 'area_manager', 'technician']
export function eligibleMembership(member, areaId) {
  return member?.status === 'active' && ENVIRONMENT_ROLES.includes(member.role) &&
    (['owner', 'farm_manager'].includes(member.role) || Boolean(areaId && member.areaId === areaId))
}
export function eligibleAlertWorker(member, areaId) {
  return member?.status === 'active' && ['area_manager', 'technician'].includes(member.role) && Boolean(areaId && member.areaId === areaId)
}
export async function eligibleAlertMembers(tx, farmId, areaId, excludeUserId = null) {
  if (!areaId) return []
  return tx.farmMember.findMany({
    where: { farmId, status: 'active', areaId, role: { in: ['area_manager', 'technician'] }, ...(excludeUserId ? { userId: { not: excludeUserId } } : {}) },
    include: { user: { select: { id: true, displayName: true, email: true } } },
    orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
  })
}
export async function defaultAlertResponsible(tx, { farmId, tank }) {
  // Keep member status/area stable until alert insertion commits.
  await tx.$queryRaw`SELECT user_id FROM farm_members WHERE farm_id = ${farmId}::uuid ORDER BY user_id FOR SHARE`
  const members = await eligibleAlertMembers(tx, farmId, tank.areaId)
  const responsible = members.find(member => member.userId === tank.responsibleUserId && eligibleAlertWorker(member, tank.areaId))
  return responsible?.userId || members.find(member => member.role === 'area_manager' && member.areaId === tank.areaId && eligibleAlertWorker(member, tank.areaId))?.userId || null
}
