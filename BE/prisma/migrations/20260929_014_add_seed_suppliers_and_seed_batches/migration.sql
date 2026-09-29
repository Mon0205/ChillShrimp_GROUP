CREATE TABLE "seed_suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farm_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "license_no" VARCHAR(80),
    "phone" VARCHAR(20),
    "address" TEXT,
    "broodstock_information" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_suppliers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seed_suppliers_farm_id_fkey"
      FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seed_suppliers_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 150)
);

CREATE INDEX "seed_suppliers_farm_id_name_idx"
  ON "seed_suppliers"("farm_id", "name");

CREATE TRIGGER "seed_suppliers_set_updated_at"
BEFORE UPDATE ON "seed_suppliers"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE "seed_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tank_id" UUID NOT NULL,
    "supplier_id" UUID,
    "batch_code" VARCHAR(50) NOT NULL,
    "supplier_lot_code" VARCHAR(80) NOT NULL,
    "species" VARCHAR(50) NOT NULL,
    "development_stage" VARCHAR(50) NOT NULL,
    "broodstock_line" VARCHAR(100),
    "broodstock_status" VARCHAR(20) NOT NULL DEFAULT 'unknown',
    "source" VARCHAR(150) NOT NULL,
    "documented_quantity" INTEGER NOT NULL,
    "initial_quantity" INTEGER NOT NULL,
    "current_estimated_quantity" INTEGER NOT NULL,
    "production_date" DATE,
    "received_at" TIMESTAMPTZ(6),
    "transport_duration_minutes" INTEGER,
    "health_certificate_url" TEXT,
    "stocked_date" DATE NOT NULL,
    "expected_sale_date" DATE NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_batches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seed_batches_tank_id_fkey"
      FOREIGN KEY ("tank_id") REFERENCES "ponds_tanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "seed_batches_supplier_id_fkey"
      FOREIGN KEY ("supplier_id") REFERENCES "seed_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "seed_batches_species_check"
      CHECK ("species" IN ('white_leg_shrimp', 'black_tiger_shrimp')),
    CONSTRAINT "seed_batches_broodstock_status_check"
      CHECK ("broodstock_status" IN ('spf', 'spr', 'standard', 'unknown')),
    CONSTRAINT "seed_batches_status_check"
      CHECK ("status" IN ('active', 'ready_for_sale', 'sold', 'failed', 'cancelled')),
    CONSTRAINT "seed_batches_documented_quantity_check" CHECK ("documented_quantity" >= 0),
    CONSTRAINT "seed_batches_initial_quantity_check" CHECK ("initial_quantity" > 0),
    CONSTRAINT "seed_batches_current_estimated_quantity_check" CHECK ("current_estimated_quantity" >= 0),
    CONSTRAINT "seed_batches_transport_duration_check"
      CHECK ("transport_duration_minutes" IS NULL OR "transport_duration_minutes" >= 0),
    CONSTRAINT "seed_batches_sale_date_check" CHECK ("expected_sale_date" >= "stocked_date")
);

CREATE UNIQUE INDEX "seed_batches_batch_code_key" ON "seed_batches"("batch_code");
CREATE INDEX "seed_batches_tank_id_status_idx" ON "seed_batches"("tank_id", "status");
CREATE INDEX "seed_batches_supplier_id_idx" ON "seed_batches"("supplier_id");
CREATE INDEX "seed_batches_status_idx" ON "seed_batches"("status");

CREATE UNIQUE INDEX "uq_seed_batches_one_current_per_tank"
  ON "seed_batches"("tank_id")
  WHERE "status" IN ('active', 'ready_for_sale');

CREATE TRIGGER "seed_batches_set_updated_at"
BEFORE UPDATE ON "seed_batches"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
