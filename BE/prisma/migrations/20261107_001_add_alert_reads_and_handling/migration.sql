-- Keep legacy is_read for compatibility; individual readers cannot be inferred from it.
ALTER TABLE "alerts_notifications"
  ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'open',
  ADD COLUMN "handling_notes" TEXT,
  ADD COLUMN "handled_by" TEXT,
  ADD COLUMN "handled_at" TIMESTAMPTZ(6),
  ADD CONSTRAINT "alerts_notifications_handled_by_fkey"
    FOREIGN KEY ("handled_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "alerts_notifications_status_check"
    CHECK ("status" IN ('open', 'in_progress', 'resolved')),
  ADD CONSTRAINT "alerts_notifications_handling_check"
    CHECK (
      ("status" = 'open' AND "handling_notes" IS NULL AND "handled_by" IS NULL AND "handled_at" IS NULL)
      OR ("status" IN ('in_progress', 'resolved') AND "handling_notes" IS NOT NULL
          AND char_length(btrim("handling_notes")) BETWEEN 1 AND 4000
          AND "handled_by" IS NOT NULL AND "handled_at" IS NOT NULL)
    );

CREATE INDEX "alerts_notifications_handled_by_idx" ON "alerts_notifications"("handled_by");
CREATE INDEX "alerts_notifications_farm_id_status_created_at_idx"
  ON "alerts_notifications"("farm_id", "status", "created_at");

CREATE TABLE "alert_reads" (
  "alert_id" UUID NOT NULL,
  "user_id" TEXT NOT NULL,
  "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "alert_reads_pkey" PRIMARY KEY ("alert_id", "user_id"),
  CONSTRAINT "alert_reads_alert_id_fkey" FOREIGN KEY ("alert_id")
    REFERENCES "alerts_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "alert_reads_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "alert_reads_user_id_idx" ON "alert_reads"("user_id");
