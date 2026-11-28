export function buildWaterChart(logs, tankId, metric, threshold = null, window = null) {
  const rows = logs.filter(log => tankId && (log.tank?.id || log.tankId) === tankId && Number.isFinite(Date.parse(log.recordedAt)) && (!window || Date.parse(log.recordedAt) >= Date.parse(window.from) && Date.parse(log.recordedAt) <= Date.parse(window.to)))
    .slice().sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
  const hasValue = log => log[metric] !== null && log[metric] !== undefined && log[metric] !== '' && Number.isFinite(Number(log[metric]))
  const values = rows.filter(hasValue).map(log => Number(log[metric]))
  if (!values.length) return { points: [], path: '', min: null, max: null, from: null, to: null }
  const bound = key => threshold?.[key] !== null && threshold?.[key] !== undefined && threshold?.[key] !== '' && Number.isFinite(Number(threshold[key])) ? Number(threshold[key]) : null
  const bounds = Object.fromEntries(['optimalMin','optimalMax','warningMin','warningMax','dangerMin','dangerMax'].map(key => [key,bound(key)]))
  const min = Math.min(...values), max = Math.max(...values)
  const rangeValues = [...values,...Object.values(bounds).filter(value => value !== null)]
  const rangeMin = Math.min(...rangeValues), rangeMax = Math.max(...rangeValues)
  const padding = (rangeMax - rangeMin || Math.max(Math.abs(rangeMax), 1)) * .15
  const axisMin = rangeMin >= 0 ? Math.max(0, rangeMin - padding) : rangeMin - padding
  const axisMax = rangeMax + padding
  const yFor = value => 170 - (value - axisMin) / (axisMax - axisMin) * 140
  const levelFor = value => {
    if ((bounds.dangerMin !== null && value < bounds.dangerMin) || (bounds.dangerMax !== null && value > bounds.dangerMax)) return 'danger'
    if ((bounds.warningMin !== null && value < bounds.warningMin) || (bounds.warningMax !== null && value > bounds.warningMax)) return 'warning'
    if (bounds.optimalMin !== null && bounds.optimalMax !== null && value >= bounds.optimalMin && value <= bounds.optimalMax) return 'optimal'
    return 'neutral'
  }
  const cuts = [...new Set([axisMin,axisMax,...Object.values(bounds).filter(value => value !== null)])].sort((a,b)=>a-b)
  const bands = threshold ? cuts.slice(1).map((high,index) => ({low:cuts[index],high,level:levelFor((cuts[index]+high)/2),y:yFor(high),height:yFor(cuts[index])-yFor(high)})).filter(band => band.level !== 'neutral') : []
  const limits = Object.entries(bounds).filter(([,value])=>value!==null).map(([key,value])=>({key,value,y:yFor(value),level:key.startsWith('danger')?'danger':key.startsWith('warning')?'warning':'optimal'}))
  const legend = []
  if (bounds.optimalMin !== null && bounds.optimalMax !== null) legend.push({level:'optimal',label:'Tối ưu',text:`${bounds.optimalMin} – ${bounds.optimalMax}`})
  for (const [prefix,label,level] of [['warning','Cảnh báo','warning'],['danger','Nguy hiểm','danger']]) {
    const parts=[]
    if(bounds[prefix+'Min']!==null)parts.push(`< ${bounds[prefix+'Min']}`)
    if(bounds[prefix+'Max']!==null)parts.push(`> ${bounds[prefix+'Max']}`)
    if(parts.length)legend.push({level,label,text:parts.join(' / ')})
  }
  const from = window?.from ? Date.parse(window.from) : Date.parse(rows[0].recordedAt), to = window?.to ? Date.parse(window.to) : Date.parse(rows.at(-1).recordedAt)
  const points = [], segments = []
  let segment = []
  let previousSegment
  for (const row of rows) {
    if (!hasValue(row)) { if (segment.length) segments.push(segment); segment = []; continue }
    if (row.chartSegment !== undefined && previousSegment !== undefined && row.chartSegment !== previousSegment) {
      if (segment.length) segments.push(segment)
      segment = []
    }
    previousSegment = row.chartSegment
    const value = Number(row[metric])
    const x = to === from ? 300 : 24 + (Date.parse(row.recordedAt) - from) / (to - from) * 552
    const y = yFor(value)
    const point = { id: row.id, x, y, value, time: row.recordedAt, level: levelFor(value) }
    points.push(point)
    segment.push(point)
  }
  if (segment.length) segments.push(segment)
  const paths = segments.map(group => group.map((point, index) =>
    `${index ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`
  ).join(' '))
  const areas = segments.flatMap((group, index) => group.length < 2 ? [] : [`${paths[index]} L${group.at(-1).x.toFixed(2)},170 L${group[0].x.toFixed(2)},170 Z`])
  const ticks = Array.from({length:5}, (_, index) => ({y:30 + index * 35,value:axisMax - (axisMax - axisMin) * index / 4}))
  return { points, path: paths.join(' '), areas, ticks, bands, limits, legend, min, max, axisMin, axisMax, from, to }

}
