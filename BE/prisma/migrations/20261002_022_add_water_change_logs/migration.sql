CREATE TABLE "water_change_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tank_id" UUID NOT NULL,
  "performed_by" TEXT NOT NULL,
  "water_change_percentage" DECIMAL(5,2) NOT NULL,
  "performed_at" TIMESTAMPTZ(6) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "water_change_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "water_change_logs_percentage_check"
    CHECK ("water_change_percentage" >= 0 AND "water_change_percentage" <= 100),
  CONSTRAINT "water_change_logs_tank_id_fkey"
    FOREIGN KEY ("tank_id") REFERENCES "ponds_tanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "water_change_logs_performed_by_fkey"
    FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "water_change_logs_tank_id_performed_at_idx"
  ON "water_change_logs"("tank_id", "performed_at");
CREATE INDEX "water_change_logs_performed_by_performed_at_idx"
  ON "water_change_logs"("performed_by", "performed_at");
