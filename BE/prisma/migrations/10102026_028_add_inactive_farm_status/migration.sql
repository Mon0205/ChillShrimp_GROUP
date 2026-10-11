ALTER TABLE "farms" DROP CONSTRAINT "farms_status_check";
ALTER TABLE "farms" ADD CONSTRAINT "farms_status_check"
  CHECK ("status" IN ('active', 'inactive', 'archived'));
