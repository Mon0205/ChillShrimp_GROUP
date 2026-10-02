CREATE TABLE "inventory_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "supply_id" UUID NOT NULL,
  "batch_id" UUID,
  "created_by" TEXT NOT NULL,
  "transaction_type" VARCHAR(20) NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "transaction_date" TIMESTAMPTZ(6) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_transactions_supply_id_fkey"
    FOREIGN KEY ("supply_id") REFERENCES "inventory_supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_transactions_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "seed_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "inventory_transactions_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_transactions_type_check"
    CHECK ("transaction_type" IN ('import', 'usage', 'adjustment')),
  CONSTRAINT "inventory_transactions_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_transactions_unit_price_check" CHECK ("unit_price" >= 0)
);

CREATE INDEX "inventory_transactions_supply_id_transaction_date_idx"
  ON "inventory_transactions"("supply_id", "transaction_date");
CREATE INDEX "inventory_transactions_batch_id_transaction_date_idx"
  ON "inventory_transactions"("batch_id", "transaction_date");

CREATE TABLE "feed_guidelines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "farm_id" UUID NOT NULL,
  "species" VARCHAR(50) NOT NULL,
  "development_stage" VARCHAR(50) NOT NULL,
  "tank_type" VARCHAR(30) NOT NULL,
  "feeding_rate_min_percent" DECIMAL(7,3),
  "feeding_rate_max_percent" DECIMAL(7,3),
  "feed_per_1000_seed_g" DECIMAL(12,3),
  "meals_per_day" INTEGER,
  "adjustment_notes" TEXT,
  "source_reference" TEXT NOT NULL,
  "approved_by" TEXT,
  "approved_at" TIMESTAMPTZ(6),
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feed_guidelines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "feed_guidelines_farm_id_fkey"
    FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "feed_guidelines_approved_by_fkey"
    FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "feed_guidelines_rates_check"
    CHECK (("feeding_rate_min_percent" IS NULL OR "feeding_rate_min_percent" BETWEEN 0 AND 100)
      AND ("feeding_rate_max_percent" IS NULL OR "feeding_rate_max_percent" BETWEEN 0 AND 100)
      AND ("feeding_rate_min_percent" IS NULL OR "feeding_rate_max_percent" IS NULL
        OR "feeding_rate_min_percent" <= "feeding_rate_max_percent")),
  CONSTRAINT "feed_guidelines_feed_per_1000_check"
    CHECK ("feed_per_1000_seed_g" IS NULL OR "feed_per_1000_seed_g" > 0),
  CONSTRAINT "feed_guidelines_meals_check" CHECK ("meals_per_day" IS NULL OR "meals_per_day" > 0),
  CONSTRAINT "feed_guidelines_effective_dates_check"
    CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);

CREATE INDEX "feed_guidelines_farm_species_stage_tank_active_idx"
  ON "feed_guidelines"("farm_id", "species", "development_stage", "tank_type", "is_active");

CREATE TRIGGER "feed_guidelines_set_updated_at"
BEFORE UPDATE ON "feed_guidelines"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
