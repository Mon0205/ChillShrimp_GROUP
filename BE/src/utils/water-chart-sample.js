import { Prisma } from '@prisma/client'
import { createHttpError } from './http.js'

const COLUMNS = {temperature:'temperature',ph:'ph',salinity:'salinity',dissolvedOxygen:'dissolved_oxygen',nh3:'nh3',tan:'tan',no2:'no2',nitrate:'nitrate',alkalinity:'alkalinity',h2s:'h2s',turbidity:'turbidity',waterLevelM:'water_level_m'}
export function validateWaterChartRange(metric, from, to) {
  if (!Object.hasOwn(COLUMNS,metric)) throw createHttpError(400,'Thông số biểu đồ không hợp lệ.')
  if (!(from instanceof Date) || !(to instanceof Date) || !Number.isFinite(+from) || !Number.isFinite(+to) || from > to || to-from > 31*86400000) throw createHttpError(400,'Chọn khoảng biểu đồ hợp lệ, tối đa 31 ngày.')
}

export async function sampleWaterChart(prisma, {farmId,tankId,areaId,metric,from,to}) {
  validateWaterChartRange(metric,from,to)
  // SQL identifiers come only from this closed whitelist. Values remain bound parameters.
  const field=Prisma.raw(`l."${COLUMNS[metric]}"`), alias=Prisma.raw(`"${metric}"`)
  const areaScope=areaId?Prisma.sql`AND t.area_id=${areaId}::uuid`:Prisma.empty
  const rows=await prisma.$queryRaw(Prisma.sql`
    WITH observations AS (
      SELECT l.id,l.tank_id,l.recorded_at,${field} AS metric_value,
        SUM(CASE WHEN ${field} IS NULL THEN 1 ELSE 0 END) OVER (ORDER BY l.recorded_at,l.id) AS segment
      FROM water_parameter_logs l JOIN ponds_tanks t ON t.id=l.tank_id
      WHERE l.tank_id=${tankId}::uuid AND t.farm_id=${farmId}::uuid AND t.deleted_at IS NULL ${areaScope}
        AND l.recorded_at>=${from}::timestamptz AND l.recorded_at<=${to}::timestamptz
    ), bucketed AS (
      SELECT *,LEAST(15,GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (recorded_at-${from}::timestamptz))
        /GREATEST(EXTRACT(EPOCH FROM (${to}::timestamptz-${from}::timestamptz)),0.001)*16)))::int AS bucket,
        (COUNT(*) OVER ())::int AS measured_count
      FROM observations WHERE metric_value IS NOT NULL
    ), ranked AS (
      SELECT *,ROW_NUMBER() OVER (PARTITION BY bucket ORDER BY recorded_at,id) AS first_rank,
        ROW_NUMBER() OVER (PARTITION BY bucket ORDER BY recorded_at DESC,id DESC) AS last_rank,
        ROW_NUMBER() OVER (PARTITION BY bucket ORDER BY metric_value,recorded_at,id) AS low_rank,
        ROW_NUMBER() OVER (PARTITION BY bucket ORDER BY metric_value DESC,recorded_at,id) AS high_rank
      FROM bucketed
    )
    SELECT id,tank_id AS "tankId",recorded_at AS "recordedAt",metric_value AS ${alias},
      segment::text AS "chartSegment",measured_count AS "measuredCount"
    FROM ranked WHERE first_rank=1 OR last_rank=1 OR low_rank=1 OR high_rank=1
    ORDER BY recorded_at,id
  `)
  const total=rows[0]?.measuredCount||0
  return {items:rows.map(({measuredCount,...row})=>row),total}
}
