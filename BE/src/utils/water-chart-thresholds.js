import { ENVIRONMENT_PARAMETERS, selectApplicableThreshold } from './environment-threshold.validation.js'

export function resolveWaterChartThresholds(thresholds, context, now = new Date()) {
  const date = new Date(`${now.toISOString().slice(0,10)}T00:00:00Z`)
  const eligible = thresholds.filter(t => t.isActive && t.approvedAt && t.approvedBy
    && new Date(t.effectiveFrom) <= date && (!t.effectiveTo || new Date(t.effectiveTo) >= date))
  return {
    asOf: now.toISOString(),
    developmentStage: context.developmentStage || null,
    species: context.species || null,
    thresholds: Object.fromEntries(Object.entries(ENVIRONMENT_PARAMETERS).map(([code, definition]) => [
      definition.field, selectApplicableThreshold(eligible.filter(t => t.parameterCode === code), context),
    ])),
  }
}
