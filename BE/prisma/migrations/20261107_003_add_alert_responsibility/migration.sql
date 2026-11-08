-- AlterTable
ALTER TABLE "alerts_notifications" ADD COLUMN     "accepted_at" TIMESTAMPTZ(6),
ADD COLUMN     "assigned_at" TIMESTAMPTZ(6),
ADD COLUMN     "assigned_by" TEXT,
ADD COLUMN     "assignment_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "responsible_user_id" TEXT;

-- CreateIndex
CREATE INDEX "alerts_notifications_responsible_user_id_status_idx" ON "alerts_notifications"("responsible_user_id", "status");

-- CreateIndex
CREATE INDEX "alerts_notifications_assigned_by_idx" ON "alerts_notifications"("assigned_by");

-- AddForeignKey
ALTER TABLE "alerts_notifications" ADD CONSTRAINT "alerts_notifications_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts_notifications" ADD CONSTRAINT "alerts_notifications_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "alerts_notifications" ADD CONSTRAINT "alerts_assignment_version_check" CHECK ("assignment_version" >= 0);
-- Preserve prior handling and receipts; only unresolved environmental alerts are assigned.
WITH candidates AS (
 SELECT alert.id,
 COALESCE(
  (SELECT member.user_id FROM farm_members member
   WHERE member.farm_id=alert.farm_id AND member.user_id=tank.responsible_user_id AND member.status='active'
    AND (member.role IN ('owner','farm_manager') OR (tank.area_id IS NOT NULL AND member.area_id=tank.area_id AND member.role IN ('area_manager','technician')))
   LIMIT 1),
  (SELECT member.user_id FROM farm_members member
   WHERE member.farm_id=alert.farm_id AND member.status='active' AND member.role='area_manager'
    AND tank.area_id IS NOT NULL AND member.area_id=tank.area_id
   ORDER BY member.created_at,member.user_id LIMIT 1)
 ) AS user_id
 FROM alerts_notifications alert JOIN ponds_tanks tank ON tank.id=alert.tank_id AND tank.farm_id=alert.farm_id
 WHERE alert.alert_type='environment_threshold' AND alert.status IN ('open','in_progress')
)
UPDATE alerts_notifications alert SET responsible_user_id=candidates.user_id,assigned_at=CURRENT_TIMESTAMP
 FROM candidates WHERE candidates.id=alert.id AND candidates.user_id IS NOT NULL;
