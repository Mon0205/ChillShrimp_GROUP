ALTER TABLE "farms"
  DROP CONSTRAINT "farms_archived_by_fkey",
  DROP COLUMN "archived_by",
  DROP COLUMN "archived_at";
