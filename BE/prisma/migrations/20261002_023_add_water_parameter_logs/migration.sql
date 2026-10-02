CREATE TABLE "water_parameter_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tank_id" UUID NOT NULL,
  "recorded_by" TEXT NOT NULL,
  "temperature" DECIMAL(12,3),
  "ph" DECIMAL(12,3),
  "salinity" DECIMAL(12,3),
  "dissolved_oxygen" DECIMAL(12,3),
  "nh3" DECIMAL(12,3),
  "tan" DECIMAL(12,3),
  "no2" DECIMAL(12,3),
  "nitrate" DECIMAL(12,3),
  "alkalinity" DECIMAL(12,3),
  "h2s" DECIMAL(12,3),
  "turbidity" DECIMAL(12,3),
  "water_level_m" DECIMAL(12,3),
  "measurement_method" VARCHAR(20) NOT NULL DEFAULT 'manual',
  "measurement_device" VARCHAR(100),
  "recorded_at" TIMESTAMPTZ(6) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "water_parameter_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "water_parameter_logs_method_check"
    CHECK ("measurement_method" IN ('manual', 'iot', 'lab')),
  CONSTRAINT "water_parameter_logs_ph_check"
    CHECK ("ph" IS NULL OR ("ph" >= 0 AND "ph" <= 14)),
  CONSTRAINT "water_parameter_logs_has_measurement_check"
    CHECK (
      "temperature" IS NOT NULL OR "ph" IS NOT NULL OR "salinity" IS NOT NULL OR
      "dissolved_oxygen" IS NOT NULL OR "nh3" IS NOT NULL OR "tan" IS NOT NULL OR
      "no2" IS NOT NULL OR "nitrate" IS NOT NULL OR "alkalinity" IS NOT NULL OR
      "h2s" IS NOT NULL OR "turbidity" IS NOT NULL OR "water_level_m" IS NOT NULL
    ),
  CONSTRAINT "water_parameter_logs_nonnegative_check"
    CHECK (
      ("salinity" IS NULL OR "salinity" >= 0) AND
      ("dissolved_oxygen" IS NULL OR "dissolved_oxygen" >= 0) AND
      ("nh3" IS NULL OR "nh3" >= 0) AND
      ("tan" IS NULL OR "tan" >= 0) AND
      ("no2" IS NULL OR "no2" >= 0) AND
      ("nitrate" IS NULL OR "nitrate" >= 0) AND
      ("alkalinity" IS NULL OR "alkalinity" >= 0) AND
      ("h2s" IS NULL OR "h2s" >= 0) AND
      ("turbidity" IS NULL OR "turbidity" >= 0) AND
      ("water_level_m" IS NULL OR "water_level_m" >= 0)
    ),
  CONSTRAINT "water_parameter_logs_tank_id_fkey"
    FOREIGN KEY ("tank_id") REFERENCES "ponds_tanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "water_parameter_logs_recorded_by_fkey"
    FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "water_parameter_logs_tank_id_recorded_at_idx"
  ON "water_parameter_logs"("tank_id", "recorded_at");
CREATE INDEX "water_parameter_logs_recorded_by_recorded_at_idx"
  ON "water_parameter_logs"("recorded_by", "recorded_at");
