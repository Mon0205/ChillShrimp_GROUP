-- Existing tanks remain unassigned; new assignments are validated by the API.
ALTER TABLE "ponds_tanks" ADD COLUMN "responsible_user_id" TEXT;
ALTER TABLE "ponds_tanks" ADD CONSTRAINT "ponds_tanks_responsible_user_id_fkey"
  FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ponds_tanks_responsible_user_id_deleted_at_idx"
  ON "ponds_tanks"("responsible_user_id", "deleted_at");
