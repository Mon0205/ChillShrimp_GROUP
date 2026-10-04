CREATE TABLE "environment_thresholds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "farm_id" UUID NOT NULL,
  "species" VARCHAR(50) NOT NULL,
  "development_stage" VARCHAR(50) NOT NULL,
  "tank_type" VARCHAR(30) NOT NULL,
  "parameter_code" VARCHAR(30) NOT NULL,
  "unit" VARCHAR(20) NOT NULL,
  "optimal_min" DECIMAL(12,3),
  "optimal_max" DECIMAL(12,3),
  "warning_min" DECIMAL(12,3),
  "warning_max" DECIMAL(12,3),
  "danger_min" DECIMAL(12,3),
  "danger_max" DECIMAL(12,3),
  "source_reference" TEXT NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT NOT NULL,
  "approved_by" TEXT,
  "approved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "environment_thresholds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "environment_thresholds_farm_id_fkey"
    FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "environment_thresholds_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "environment_thresholds_approved_by_fkey"
    FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "environment_thresholds_selector_check"
    CHECK ("species" <> '' AND "development_stage" <> '' AND "tank_type" IN ('nursery_tank', 'pond', 'other', 'all')),
  CONSTRAINT "environment_thresholds_parameter_check"
    CHECK ("parameter_code" IN ('temperature', 'ph', 'salinity', 'do', 'nh3', 'tan', 'no2', 'nitrate', 'alkalinity', 'h2s', 'turbidity', 'water_level')),
  CONSTRAINT "environment_thresholds_has_alert_range_check"
    CHECK ("warning_min" IS NOT NULL OR "warning_max" IS NOT NULL OR "danger_min" IS NOT NULL OR "danger_max" IS NOT NULL),
  CONSTRAINT "environment_thresholds_range_order_check"
    CHECK (
      ("optimal_min" IS NULL OR "optimal_max" IS NULL OR "optimal_min" <= "optimal_max") AND
      ("warning_min" IS NULL OR "warning_max" IS NULL OR "warning_min" <= "warning_max") AND
      ("danger_min" IS NULL OR "danger_max" IS NULL OR "danger_min" <= "danger_max") AND
      ("danger_min" IS NULL OR "warning_min" IS NULL OR "danger_min" <= "warning_min") AND
      ("danger_max" IS NULL OR "warning_max" IS NULL OR "danger_max" >= "warning_max")
    ),
  CONSTRAINT "environment_thresholds_effective_dates_check"
    CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
  CONSTRAINT "environment_thresholds_nonnegative_bounds_check"
    CHECK ("parameter_code" = 'temperature' OR
      ("optimal_min" IS NULL OR "optimal_min" >= 0) AND ("optimal_max" IS NULL OR "optimal_max" >= 0) AND
      ("warning_min" IS NULL OR "warning_min" >= 0) AND ("warning_max" IS NULL OR "warning_max" >= 0) AND
      ("danger_min" IS NULL OR "danger_min" >= 0) AND ("danger_max" IS NULL OR "danger_max" >= 0)),
  CONSTRAINT "environment_thresholds_ph_bounds_check"
    CHECK ("parameter_code" <> 'ph' OR
      ("optimal_min" IS NULL OR "optimal_min" BETWEEN 0 AND 14) AND ("optimal_max" IS NULL OR "optimal_max" BETWEEN 0 AND 14) AND
      ("warning_min" IS NULL OR "warning_min" BETWEEN 0 AND 14) AND ("warning_max" IS NULL OR "warning_max" BETWEEN 0 AND 14) AND
      ("danger_min" IS NULL OR "danger_min" BETWEEN 0 AND 14) AND ("danger_max" IS NULL OR "danger_max" BETWEEN 0 AND 14)),
  CONSTRAINT "environment_thresholds_approval_check"
    CHECK (("approved_by" IS NULL) = ("approved_at" IS NULL))
);

CREATE INDEX "environment_thresholds_farm_active_dates_idx"
  ON "environment_thresholds"("farm_id", "is_active", "effective_from", "effective_to");
CREATE INDEX "environment_thresholds_match_idx"
  ON "environment_thresholds"("farm_id", "species", "development_stage", "tank_type", "parameter_code");

CREATE TABLE "alerts_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "farm_id" UUID NOT NULL,
  "batch_id" UUID,
  "tank_id" UUID,
  "threshold_id" UUID,
  "source_log_id" UUID,
  "parameter_code" VARCHAR(30),
  "observed_value" DECIMAL(12,3),
  "alert_type" VARCHAR(30) NOT NULL,
  "severity" VARCHAR(20) NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "alerts_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "alerts_notifications_farm_id_fkey"
    FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "alerts_notifications_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "seed_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "alerts_notifications_tank_id_fkey"
    FOREIGN KEY ("tank_id") REFERENCES "ponds_tanks"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "alerts_notifications_threshold_id_fkey"
    FOREIGN KEY ("threshold_id") REFERENCES "environment_thresholds"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "alerts_notifications_source_log_id_fkey"
    FOREIGN KEY ("source_log_id") REFERENCES "water_parameter_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "alerts_notifications_severity_check"
    CHECK ("severity" IN ('info', 'warning', 'critical'))
);

CREATE UNIQUE INDEX "alerts_notifications_source_log_parameter_key"
  ON "alerts_notifications"("source_log_id", "parameter_code");
CREATE INDEX "alerts_notifications_farm_type_created_idx"
  ON "alerts_notifications"("farm_id", "alert_type", "created_at");
CREATE INDEX "alerts_notifications_tank_created_idx"
  ON "alerts_notifications"("tank_id", "created_at");
