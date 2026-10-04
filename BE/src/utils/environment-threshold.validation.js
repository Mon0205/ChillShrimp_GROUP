export const ENVIRONMENT_PARAMETERS = {
  temperature: { field: 'temperature', title: 'Temperature', defaultUnit: '°C' },
  ph: { field: 'ph', title: 'pH', defaultUnit: '' },
  salinity: { field: 'salinity', title: 'Salinity', defaultUnit: 'ppt' },
  do: { field: 'dissolvedOxygen', title: 'Dissolved oxygen', defaultUnit: 'mg/L' },
  nh3: { field: 'nh3', title: 'NH3', defaultUnit: 'mg/L' },
  tan: { field: 'tan', title: 'TAN', defaultUnit: 'mg/L' },
  no2: { field: 'no2', title: 'NO2', defaultUnit: 'mg/L' },
  nitrate: { field: 'nitrate', title: 'Nitrate', defaultUnit: 'mg/L' },
  alkalinity: { field: 'alkalinity', title: 'Alkalinity', defaultUnit: 'mg/L CaCO3' },
  h2s: { field: 'h2s', title: 'H2S', defaultUnit: 'ppm' },
  turbidity: { field: 'turbidity', title: 'Turbidity', defaultUnit: 'NTU' },
  water_level: { field: 'waterLevelM', title: 'Water level', defaultUnit: 'm' },
}

const TANK_TYPES = new Set(['all', 'nursery_tank', 'pond', 'other'])
const RANGE_FIELDS = ['optimalMin', 'optimalMax', 'warningMin', 'warningMax', 'dangerMin', 'dangerMax']

function optionalBound(value, field) {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < -999_999_999.999 || number > 999_999_999.999) {
    throw new Error(`${field} must be a finite number within the supported range.`)
  }
  if (Math.abs(number * 1000 - Math.round(number * 1000)) > 1e-7) {
    throw new Error(`${field} supports at most 3 decimal places.`)
  }
  return number
}

function dateOnly(value, field, optional = false) {
  if ((value === undefined || value === null || value === '') && optional) return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field} must use YYYY-MM-DD.`)
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`${field} is not a valid date.`)
  return date
}

export function normalizeEnvironmentThresholdInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Threshold data must be an object.')
  const allowed = new Set(['species', 'developmentStage', 'tankType', 'parameterCode', 'unit', ...RANGE_FIELDS, 'sourceReference', 'effectiveFrom', 'effectiveTo'])
  const unknown = Object.keys(body).find((key) => !allowed.has(key))
  if (unknown) throw new Error(`Unsupported field: ${unknown}.`)

  const species = typeof body.species === 'string' ? body.species.trim() : ''
  const developmentStage = typeof body.developmentStage === 'string' ? body.developmentStage.trim() : ''
  const tankType = body.tankType
  const parameterCode = body.parameterCode
  const unit = typeof body.unit === 'string' ? body.unit.trim() : ''
  const sourceReference = typeof body.sourceReference === 'string' ? body.sourceReference.trim() : ''
  if (!species || species.length > 50) throw new Error('Species is required and must not exceed 50 characters.')
  if (!developmentStage || developmentStage.length > 50) throw new Error('Development stage is required and must not exceed 50 characters.')
  if (!TANK_TYPES.has(tankType)) throw new Error('Tank type is invalid.')
  if (!Object.hasOwn(ENVIRONMENT_PARAMETERS, parameterCode)) throw new Error('Parameter code is invalid.')
  if (!unit || unit.length > 20) throw new Error('Unit is required and must not exceed 20 characters.')
  if (!sourceReference || sourceReference.length > 4000) throw new Error('Source reference is required and must not exceed 4000 characters.')

  const bounds = Object.fromEntries(RANGE_FIELDS.map((field) => [field, optionalBound(body[field], field)]))
  if (['temperature', 'ph'].includes(parameterCode)) {
    for (const [field, value] of Object.entries(bounds)) {
      if (value !== null && value < 0 && parameterCode === 'ph') throw new Error('pH bounds cannot be negative.')
    }
    if (parameterCode === 'ph' && Object.values(bounds).some((value) => value !== null && value > 14)) throw new Error('pH bounds must be between 0 and 14.')
  } else if (Object.values(bounds).some((value) => value !== null && value < 0)) {
    throw new Error('Bounds for this parameter cannot be negative.')
  }

  const orderedPairs = [['optimalMin', 'optimalMax'], ['warningMin', 'warningMax'], ['dangerMin', 'dangerMax']]
  for (const [min, max] of orderedPairs) {
    if (bounds[min] !== null && bounds[max] !== null && bounds[min] > bounds[max]) throw new Error(`${min} must not exceed ${max}.`)
  }
  if (bounds.warningMin === null && bounds.warningMax === null && bounds.dangerMin === null && bounds.dangerMax === null) {
    throw new Error('At least one warning or danger bound is required.')
  }
  if (bounds.dangerMin !== null && bounds.warningMin !== null && bounds.dangerMin > bounds.warningMin) throw new Error('dangerMin must be at or below warningMin.')
  if (bounds.dangerMax !== null && bounds.warningMax !== null && bounds.dangerMax < bounds.warningMax) throw new Error('dangerMax must be at or above warningMax.')

  const effectiveFrom = dateOnly(body.effectiveFrom, 'effectiveFrom')
  const effectiveTo = dateOnly(body.effectiveTo, 'effectiveTo', true)
  if (effectiveTo && effectiveTo < effectiveFrom) throw new Error('effectiveTo must be on or after effectiveFrom.')

  return { species, developmentStage, tankType, parameterCode, unit, ...bounds, sourceReference, effectiveFrom, effectiveTo }
}

export function classifyEnvironmentMeasurement(value, threshold) {
  const belowDanger = threshold.dangerMin !== null && value < Number(threshold.dangerMin)
  const aboveDanger = threshold.dangerMax !== null && value > Number(threshold.dangerMax)
  if (belowDanger || aboveDanger) return 'critical'

  const belowWarning = threshold.warningMin !== null && value < Number(threshold.warningMin)
  const aboveWarning = threshold.warningMax !== null && value > Number(threshold.warningMax)
  return belowWarning || aboveWarning ? 'warning' : null
}

export function selectApplicableThreshold(thresholds, { species, developmentStage, tankType }) {
  return thresholds
    .filter((threshold) => (threshold.species === 'all' || threshold.species === species)
      && (threshold.developmentStage === 'all' || threshold.developmentStage === developmentStage)
      && (threshold.tankType === 'all' || threshold.tankType === tankType))
    .sort((a, b) => {
      const score = (item) => Number(item.species !== 'all') + Number(item.developmentStage !== 'all') + Number(item.tankType !== 'all')
      return score(b) - score(a) || new Date(b.effectiveFrom) - new Date(a.effectiveFrom) || new Date(b.updatedAt) - new Date(a.updatedAt)
    })[0] || null
}
