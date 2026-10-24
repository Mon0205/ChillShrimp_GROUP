-- Farm managers have farm-wide scope, without a per-area assignment.
ALTER TABLE "farm_members" DROP CONSTRAINT "farm_members_role_area_check";
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_role_area_check" CHECK (
  ("role" IN ('area_manager', 'technician') AND "area_id" IS NOT NULL)
  OR ("role" IN ('owner', 'farm_manager', 'warehouse_staff') AND "area_id" IS NULL)
);
ALTER TABLE "farm_invitations" DROP CONSTRAINT "farm_invitations_role_area_check";
ALTER TABLE "farm_invitations" ADD CONSTRAINT "farm_invitations_role_area_check" CHECK (
  ("role" IN ('area_manager', 'technician') AND "area_id" IS NOT NULL)
  OR ("role" IN ('owner', 'farm_manager', 'warehouse_staff') AND "area_id" IS NULL)
);
-- Existing enforce_farm_membership_scope continues to restrict every non-owner
-- (including farm_manager) to one farm.
