-- Existing requests retain NULL because their destination cannot be inferred safely.
-- New requests must specify a tank through API validation.
ALTER TABLE "supply_requests" ADD COLUMN "tank_id" UUID;
CREATE INDEX "supply_requests_tank_id_created_at_idx" ON "supply_requests"("tank_id", "created_at");
ALTER TABLE "supply_requests"
  ADD CONSTRAINT "supply_requests_tank_id_fkey"
  FOREIGN KEY ("tank_id") REFERENCES "ponds_tanks"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
