ALTER TABLE "batch_quantity_events"
  ADD COLUMN "adjustment_direction" VARCHAR(10);

ALTER TABLE "batch_quantity_events"
  ADD CONSTRAINT "batch_quantity_events_adjustment_direction_check"
  CHECK ("adjustment_direction" IS NULL OR "adjustment_direction" IN ('increase', 'decrease'));

ALTER TABLE "batch_quantity_events"
  ADD CONSTRAINT "batch_quantity_events_adjustment_type_check"
  CHECK ("adjustment_direction" IS NULL OR "event_type" = 'adjustment') NOT VALID;

ALTER TABLE "batch_quantity_events"
  ADD CONSTRAINT "batch_quantity_events_adjustment_required_check"
  CHECK ("event_type" <> 'adjustment' OR "adjustment_direction" IN ('increase', 'decrease')) NOT VALID;
