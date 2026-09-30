CREATE TABLE "inventory_supplies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farm_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "min_threshold" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_supplies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_supplies_farm_id_fkey"
      FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_supplies_category_check"
      CHECK ("category" IN ('feed', 'medicine', 'chemical', 'probiotic', 'other')),
    CONSTRAINT "inventory_supplies_quantity_check" CHECK ("quantity" >= 0),
    CONSTRAINT "inventory_supplies_unit_price_check" CHECK ("unit_price" >= 0),
    CONSTRAINT "inventory_supplies_min_threshold_check" CHECK ("min_threshold" >= 0)
);

CREATE INDEX "inventory_supplies_farm_id_category_name_idx"
  ON "inventory_supplies"("farm_id", "category", "name");

CREATE TRIGGER "inventory_supplies_set_updated_at"
BEFORE UPDATE ON "inventory_supplies"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
