ALTER TABLE "feeding_logs"
  ADD COLUMN "supply_id" UUID,
  ADD CONSTRAINT "feeding_logs_supply_id_fkey"
    FOREIGN KEY ("supply_id") REFERENCES "inventory_supplies"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "feeding_logs_supply_id_idx" ON "feeding_logs"("supply_id");
