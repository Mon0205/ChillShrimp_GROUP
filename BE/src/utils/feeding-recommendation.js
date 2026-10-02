export function calculateRecommendedFeed({ guideline, batch, biomassSnapshotKg = null }) {
  if (!guideline || !batch) return null

  if (biomassSnapshotKg > 0 && guideline.feedingRateMinPercent !== null && guideline.feedingRateMaxPercent !== null) {
    const rate = (Number(guideline.feedingRateMinPercent) + Number(guideline.feedingRateMaxPercent)) / 2
    return {
      amount: Number((biomassSnapshotKg * rate / 100).toFixed(3)),
      unit: 'kg',
      ratePercent: Number(rate.toFixed(3)),
      mealsPerDay: guideline.mealsPerDay,
      sourceReference: guideline.sourceReference,
      adjustmentNotes: guideline.adjustmentNotes,
    }
  }

  if (guideline.feedPer1000SeedG !== null && batch.currentEstimatedQuantity > 0) {
    return {
      amount: Number((batch.currentEstimatedQuantity / 1000 * Number(guideline.feedPer1000SeedG)).toFixed(3)),
      unit: 'g',
      ratePercent: null,
      mealsPerDay: guideline.mealsPerDay,
      sourceReference: guideline.sourceReference,
      adjustmentNotes: guideline.adjustmentNotes,
    }
  }

  return null
}
