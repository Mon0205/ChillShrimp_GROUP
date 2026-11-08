CREATE TABLE "alert_assignment_notifications" (
  "id" UUID NOT NULL,
  "farm_id" UUID NOT NULL,
  "alert_id" UUID NOT NULL,
  "recipient_id" TEXT NOT NULL,
  "assignment_version" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" TIMESTAMPTZ(6),
  CONSTRAINT "alert_assignment_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "alert_assignment_notifications_assignment_version_check" CHECK ("assignment_version" >= 0),
  CONSTRAINT "alert_assignment_notifications_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "alert_assignment_notifications_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "alert_assignment_notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "alert_assignment_notification_event_key"
  ON "alert_assignment_notifications"("alert_id", "recipient_id", "assignment_version");
CREATE INDEX "alert_assignment_notification_inbox_idx"
  ON "alert_assignment_notifications"("farm_id", "recipient_id", "created_at");
CREATE INDEX "alert_assignment_notification_unread_idx"
  ON "alert_assignment_notifications"("recipient_id", "read_at");

-- Only backfill current, valid workers; do not change assignments or alert receipts.
INSERT INTO "alert_assignment_notifications" ("id", "farm_id", "alert_id", "recipient_id", "assignment_version")
SELECT gen_random_uuid(), alert.farm_id, alert.id, alert.responsible_user_id, alert.assignment_version
FROM alerts_notifications alert
JOIN ponds_tanks tank ON tank.id = alert.tank_id AND tank.farm_id = alert.farm_id
JOIN farms farm ON farm.id = alert.farm_id AND farm.status = 'active'
JOIN farm_members member ON member.farm_id = alert.farm_id
  AND member.user_id = alert.responsible_user_id
  AND member.status = 'active'
  AND member.role IN ('technician', 'area_manager')
  AND member.area_id = tank.area_id
WHERE alert.alert_type = 'environment_threshold'
  AND alert.status IN ('open', 'in_progress')
  AND tank.area_id IS NOT NULL
ON CONFLICT ("alert_id", "recipient_id", "assignment_version") DO NOTHING;
