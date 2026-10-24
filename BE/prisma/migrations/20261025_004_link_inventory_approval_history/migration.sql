ALTER TABLE "inventory_transactions" ADD COLUMN "supply_request_id" UUID;
CREATE UNIQUE INDEX "inventory_transactions_supply_request_id_key"
  ON "inventory_transactions"("supply_request_id");
ALTER TABLE "inventory_transactions"
  ADD CONSTRAINT "inventory_transactions_supply_request_id_fkey"
  FOREIGN KEY ("supply_request_id") REFERENCES "supply_requests"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
