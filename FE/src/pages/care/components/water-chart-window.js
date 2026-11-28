export function waterChartWindow(recordedAt,hours,offset=0,filters={}) {
  const anchor=Date.parse(recordedAt),span=Number(hours)*3600000
  if(!Number.isFinite(anchor)||![24,168,720].includes(Number(hours))||!Number.isInteger(offset)||offset<0)return null
  const filterFrom=filters.from?Date.parse(`${filters.from}T00:00:00`):-Infinity
  const filterTo=filters.to?Date.parse(`${filters.to}T23:59:59.999`):Infinity
  if(Number.isNaN(filterFrom)||Number.isNaN(filterTo)||filterFrom>filterTo)return null
  const end=Math.min(anchor,filterTo)-offset*span
  const start=Math.max(end-span,filterFrom)
  return start>end?null:{from:new Date(start).toISOString(),to:new Date(end).toISOString(),canOlder:start>filterFrom}
}
