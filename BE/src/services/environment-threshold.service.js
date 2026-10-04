import { Prisma } from '@prisma/client'
import {
  classifyEnvironmentMeasurement,
  ENVIRONMENT_PARAMETERS,
  selectApplicableThreshold,
} from '../utils/environment-threshold.validation.js'

export async function createEnvironmentAlerts(tx, { farmId, tank, log }) {
  const activeBatch = await tx.seedBatch.findFirst({
    where: { tankId: tank.id, status: { notIn: ['sold', 'failed', 'cancelled'] } },
    orderBy: [{ createdAt: 'desc' }],
    select: { id: true, species: true, developmentStage: true },
  })
  const measured = Object.entries(ENVIRONMENT_PARAMETERS)
    .filter(([, definition]) => log[definition.field] !== null)
    .map(([parameterCode, definition]) => ({
      parameterCode,
      ...definition,
      value: Number(log[definition.field]),
    }))
  if (!measured.length) return []

  const effectiveDate = new Date(`${log.recordedAt.toISOString().slice(0, 10)}T00:00:00.000Z`)
  const thresholds = await tx.environmentThreshold.findMany({
    where: {
      farmId,
      isActive: true,
      approvedAt: { not: null },
      approvedBy: { not: null },
      effectiveFrom: { lte: effectiveDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveDate } }],
      parameterCode: { in: measured.map((entry) => entry.parameterCode) },
    },
  })

  const alerts = []
  for (const measurement of measured) {
    const threshold = selectApplicableThreshold(thresholds.filter((item) => item.parameterCode === measurement.parameterCode), {
      species: activeBatch?.species,
      developmentStage: activeBatch?.developmentStage,
      tankType: tank.tankType,
    })
    if (!threshold) continue

    const severity = classifyEnvironmentMeasurement(measurement.value, threshold)
    if (!severity) continue
    const lowerLimit = severity === 'critical' ? threshold.dangerMin : threshold.warningMin
    const isBelowLimit = lowerLimit !== null && measurement.value < Number(lowerLimit)
    const boundary = severity === 'critical'
      ? (isBelowLimit ? `below danger limit ${threshold.dangerMin}` : `above danger limit ${threshold.dangerMax}`)
      : (isBelowLimit ? `below warning limit ${threshold.warningMin}` : `above warning limit ${threshold.warningMax}`)
    alerts.push({
      farmId,
      batchId: activeBatch?.id || null,
      tankId: tank.id,
      thresholdId: threshold.id,
      sourceLogId: log.id,
      parameterCode: measurement.parameterCode,
      observedValue: new Prisma.Decimal(String(measurement.value)),
      alertType: 'environment_threshold',
      severity,
      title: `${measurement.title} ${severity === 'critical' ? 'critical' : 'warning'}`,
      message: `${tank.name} (${tank.code}): measured ${measurement.value}${threshold.unit ? ` ${threshold.unit}` : ''}, ${boundary}. Applicable rule: ${threshold.species}/${threshold.developmentStage}/${threshold.tankType}.`,
    })
  }

  if (!alerts.length) return []
  await tx.alertNotification.createMany({ data: alerts })
  return tx.alertNotification.findMany({
    where: { sourceLogId: log.id },
    orderBy: [{ parameterCode: 'asc' }],
  })
}
