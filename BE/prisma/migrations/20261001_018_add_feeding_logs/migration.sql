CREATE TABLE "feeding_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tank_id" UUID NOT NULL,
    "performed_by" TEXT NOT NULL,
    "feed_name" VARCHAR(150) NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "biomass_snapshot_kg" DECIMAL(12,3),
    "feeding_rate_percent" DECIMAL(7,3),
    "recommended_amount" DECIMAL(12,3),
    "feed_check_status" VARCHAR(20),
    "feeding_time" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feeding_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feeding_logs_tank_id_fkey"
      FOREIGN KEY ("tank_id") REFERENCES "ponds_tanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "feeding_logs_performed_by_fkey"
      FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "feeding_logs_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "feeding_logs_biomass_check" CHECK ("biomass_snapshot_kg" IS NULL OR "biomass_snapshot_kg" > 0),
    CONSTRAINT "feeding_logs_rate_check" CHECK ("feeding_rate_percent" IS NULL OR "feeding_rate_percent" BETWEEN 0 AND 100),
    CONSTRAINT "feeding_logs_recommended_amount_check" CHECK ("recommended_amount" IS NULL OR "recommended_amount" >= 0),
    CONSTRAINT "feeding_logs_check_status_check" CHECK ("feed_check_status" IS NULL OR "feed_check_status" IN ('consumed', 'leftover', 'not_checked'))
);

CREATE INDEX "feeding_logs_tank_id_feeding_time_idx" ON "feeding_logs"("tank_id", "feeding_time");
CREATE INDEX "feeding_logs_performed_by_feeding_time_idx" ON "feeding_logs"("performed_by", "feeding_time");
