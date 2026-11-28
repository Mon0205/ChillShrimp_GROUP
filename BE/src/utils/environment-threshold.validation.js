export const ENVIRONMENT_PARAMETERS = {
  temperature: { field: 'temperature', title: 'Nhiệt độ', defaultUnit: '°C' },
  ph: { field: 'ph', title: 'pH', defaultUnit: '' },
  salinity: { field: 'salinity', title: 'Độ mặn', defaultUnit: 'ppt' },
  do: { field: 'dissolvedOxygen', title: 'Oxy hòa tan', defaultUnit: 'mg/L' },
  nh3: { field: 'nh3', title: 'NH3', defaultUnit: 'mg/L' },
  tan: { field: 'tan', title: 'TAN', defaultUnit: 'mg/L' },
  no2: { field: 'no2', title: 'NO2', defaultUnit: 'mg/L' },
  nitrate: { field: 'nitrate', title: 'Nitrat', defaultUnit: 'mg/L' },
  alkalinity: { field: 'alkalinity', title: 'Độ kiềm', defaultUnit: 'mg/L CaCO3' },
  h2s: { field: 'h2s', title: 'H2S', defaultUnit: 'ppm' },
  turbidity: { field: 'turbidity', title: 'Độ đục', defaultUnit: 'NTU' },
  water_level: { field: 'waterLevelM', title: 'Mực nước', defaultUnit: 'm' },
}

const TANK_TYPES = new Set(['all', 'nursery_tank', 'pond', 'other'])
const RANGE_FIELDS = ['optimalMin', 'optimalMax', 'warningMin', 'warningMax', 'dangerMin', 'dangerMax']
// Same wording as the threshold form, so a message points at the field the user sees.
const FIELD_LABELS = {
  optimalMin: 'Tối ưu từ', optimalMax: 'Tối ưu đến',
  warningMin: 'Cảnh báo dưới', warningMax: 'Cảnh báo trên',
  dangerMin: 'Nguy cấp dưới', dangerMax: 'Nguy cấp trên',
  effectiveFrom: 'Ngày bắt đầu hiệu lực', effectiveTo: 'Ngày kết thúc hiệu lực',
}

function optionalBound(value, field) {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < -999_999_999.999 || number > 999_999_999.999) {
    throw new Error(`${FIELD_LABELS[field]} phải là số hợp lệ trong giới hạn cho phép.`)
  }
  if (Math.abs(number * 1000 - Math.round(number * 1000)) > 1e-7) {
    throw new Error(`${FIELD_LABELS[field]} chỉ được có tối đa 3 chữ số thập phân.`)
  }
  return number
}

function dateOnly(value, field, optional = false) {
  if ((value === undefined || value === null || value === '') && optional) return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${FIELD_LABELS[field]} phải theo định dạng YYYY-MM-DD.`)
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`${FIELD_LABELS[field]} không phải ngày hợp lệ.`)
  return date
}

export function normalizeEnvironmentThresholdInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dữ liệu ngưỡng không hợp lệ.')
  const allowed = new Set(['species', 'developmentStage', 'tankType', 'parameterCode', 'unit', ...RANGE_FIELDS, 'effectiveFrom', 'effectiveTo'])
  const unknown = Object.keys(body).find((key) => !allowed.has(key))
  if (unknown) throw new Error(`Trường ${unknown} không được hỗ trợ.`)

  const species = typeof body.species === 'string' ? body.species.trim() : ''
  const developmentStage = typeof body.developmentStage === 'string' ? body.developmentStage.trim() : ''
  const tankType = body.tankType
  const parameterCode = body.parameterCode
  const unit = typeof body.unit === 'string' ? body.unit.trim() : ''
  if (!species || species.length > 50) throw new Error('Loài là bắt buộc và tối đa 50 ký tự.')
  if (!developmentStage || developmentStage.length > 50) throw new Error('Giai đoạn là bắt buộc và tối đa 50 ký tự.')
  if (!TANK_TYPES.has(tankType)) throw new Error('Loại ao/bể không hợp lệ.')
  if (!Object.hasOwn(ENVIRONMENT_PARAMETERS, parameterCode)) throw new Error('Thông số không hợp lệ.')
  if (!unit || unit.length > 20) throw new Error('Đơn vị là bắt buộc và tối đa 20 ký tự.')

  const bounds = Object.fromEntries(RANGE_FIELDS.map((field) => [field, optionalBound(body[field], field)]))
  if (['temperature', 'ph'].includes(parameterCode)) {
    for (const [field, value] of Object.entries(bounds)) {
      if (value !== null && value < 0 && parameterCode === 'ph') throw new Error('Ngưỡng pH không được âm.')
    }
    if (parameterCode === 'ph' && Object.values(bounds).some((value) => value !== null && value > 14)) throw new Error('Ngưỡng pH phải nằm trong khoảng 0 đến 14.')
  } else if (Object.values(bounds).some((value) => value !== null && value < 0)) {
    throw new Error('Ngưỡng của thông số này không được âm.')
  }

  const orderedPairs = [['optimalMin', 'optimalMax'], ['warningMin', 'warningMax'], ['dangerMin', 'dangerMax']]
  for (const [min, max] of orderedPairs) {
    if (bounds[min] !== null && bounds[max] !== null && bounds[min] > bounds[max]) throw new Error(`${FIELD_LABELS[min]} không được lớn hơn ${FIELD_LABELS[max]}.`)
  }
  if (bounds.warningMin === null && bounds.warningMax === null && bounds.dangerMin === null && bounds.dangerMax === null) {
    throw new Error('Cần nhập ít nhất một mốc cảnh báo hoặc nguy cấp.')
  }
  if (bounds.dangerMin !== null && bounds.warningMin !== null && bounds.dangerMin > bounds.warningMin) throw new Error('Nguy cấp dưới phải nhỏ hơn hoặc bằng Cảnh báo dưới.')
  if (bounds.dangerMax !== null && bounds.warningMax !== null && bounds.dangerMax < bounds.warningMax) throw new Error('Nguy cấp trên phải lớn hơn hoặc bằng Cảnh báo trên.')

  const effectiveFrom = dateOnly(body.effectiveFrom, 'effectiveFrom')
  const effectiveTo = dateOnly(body.effectiveTo, 'effectiveTo', true)
  if (effectiveTo && effectiveTo < effectiveFrom) throw new Error('Ngày kết thúc hiệu lực phải bằng hoặc sau ngày bắt đầu hiệu lực.')

  return { species, developmentStage, tankType, parameterCode, unit, ...bounds, effectiveFrom, effectiveTo }
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
