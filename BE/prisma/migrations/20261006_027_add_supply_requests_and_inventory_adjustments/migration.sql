ALTER TABLE "inventory_transactions"
  DROP CONSTRAINT "inventory_transactions_quantity_check";

ALTER TABLE "inventory_transactions"
  ADD CONSTRAINT "inventory_transactions_quantity_check"
  CHECK (
    ("transaction_type" = 'adjustment' AND "quantity" <> 0)
    OR ("transaction_type" IN ('import', 'usage') AND "quantity" > 0)
  );

CREATE TABLE "supply_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "farm_id" UUID NOT NULL,
  "supply_id" UUID NOT NULL,
  "area_id" UUID,
  "requested_by" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supply_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supply_requests_farm_id_fkey"
    FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "supply_requests_supply_id_fkey"
    FOREIGN KEY ("supply_id") REFERENCES "inventory_supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supply_requests_area_id_fkey"
    FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "supply_requests_requested_by_fkey"
    FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supply_requests_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "supply_requests_status_check" CHECK ("status" IN ('pending', 'fulfilled', 'rejected', 'cancelled'))
);

CREATE INDEX "supply_requests_farm_id_status_created_at_idx"
  ON "supply_requests"("farm_id", "status", "created_at");
CREATE INDEX "supply_requests_area_id_status_created_at_idx"
  ON "supply_requests"("area_id", "status", "created_at");
CREATE INDEX "supply_requests_supply_id_created_at_idx"
  ON "supply_requests"("supply_id", "created_at");

CREATE TRIGGER "supply_requests_set_updated_at"
BEFORE UPDATE ON "supply_requests"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
