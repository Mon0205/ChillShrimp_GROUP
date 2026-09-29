ALTER TABLE "farms"
  ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN "archived_by" TEXT,
  ADD COLUMN "archived_at" TIMESTAMPTZ(6);

ALTER TABLE "farms"
  ADD CONSTRAINT "farms_status_check"
  CHECK ("status" IN ('active', 'archived'));

ALTER TABLE "farms"
  ADD CONSTRAINT "farms_archived_by_fkey"
  FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "farms_status_idx" ON "farms"("status");

ALTER TABLE "ponds_tanks"
  ADD COLUMN "deleted_by" TEXT,
  ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

ALTER TABLE "ponds_tanks"
  ADD CONSTRAINT "ponds_tanks_deleted_by_fkey"
  FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ponds_tanks_farm_id_deleted_at_idx"
  ON "ponds_tanks"("farm_id", "deleted_at");
