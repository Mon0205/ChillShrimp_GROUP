CREATE TABLE "treatment_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tank_id" UUID NOT NULL,
  "performed_by" TEXT NOT NULL,
  "supply_id" UUID,
  "product_name" VARCHAR(150) NOT NULL,
  "amount" DECIMAL(12,3) NOT NULL,
  "unit" VARCHAR(20) NOT NULL,
  "purpose" TEXT NOT NULL,
  "performed_at" TIMESTAMPTZ(6) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "treatment_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "treatment_logs_product_name_check" CHECK (length(trim("product_name")) > 0),
  CONSTRAINT "treatment_logs_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "treatment_logs_unit_check" CHECK (length(trim("unit")) > 0),
  CONSTRAINT "treatment_logs_purpose_check" CHECK (length(trim("purpose")) > 0),
  CONSTRAINT "treatment_logs_tank_id_fkey"
    FOREIGN KEY ("tank_id") REFERENCES "ponds_tanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "treatment_logs_performed_by_fkey"
    FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "treatment_logs_supply_id_fkey"
    FOREIGN KEY ("supply_id") REFERENCES "inventory_supplies"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "treatment_logs_tank_id_performed_at_idx"
  ON "treatment_logs"("tank_id", "performed_at");
CREATE INDEX "treatment_logs_performed_by_performed_at_idx"
  ON "treatment_logs"("performed_by", "performed_at");
CREATE INDEX "treatment_logs_supply_id_idx"
  ON "treatment_logs"("supply_id");
