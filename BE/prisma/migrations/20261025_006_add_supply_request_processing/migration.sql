ALTER TABLE "supply_requests"
  ADD COLUMN "processed_by" TEXT,
  ADD COLUMN "processed_at" TIMESTAMPTZ(6),
  ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "supply_requests"
  ADD CONSTRAINT "supply_requests_processed_by_fkey"
  FOREIGN KEY ("processed_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
