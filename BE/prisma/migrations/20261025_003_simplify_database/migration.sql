-- Implements the approved 19-table schema. These drops permanently remove data.
-- Back up the affected tables before deploying this migration.
BEGIN;

DROP TABLE "seed_quality_checks";
DROP TABLE "batch_quantity_events";
DROP TABLE "growth_sampling_logs";
DROP TABLE "feed_guidelines";

ALTER TABLE "feeding_logs"
  DROP COLUMN "biomass_snapshot_kg",
  DROP COLUMN "feeding_rate_percent",
  DROP COLUMN "recommended_amount";

ALTER TABLE "environment_thresholds" DROP COLUMN "source_reference";

DROP TRIGGER "seed_suppliers_set_updated_at" ON "seed_suppliers";
ALTER TABLE "seed_suppliers"
  DROP COLUMN "license_no",
  DROP COLUMN "broodstock_information",
  DROP COLUMN "notes",
  DROP COLUMN "created_at",
  DROP COLUMN "updated_at";

ALTER TABLE "seed_batches"
  DROP COLUMN "supplier_lot_code",
  DROP COLUMN "broodstock_line",
  DROP COLUMN "broodstock_status",
  DROP COLUMN "source",
  DROP COLUMN "documented_quantity",
  DROP COLUMN "production_date",
  DROP COLUMN "received_at",
  DROP COLUMN "transport_duration_minutes",
  DROP COLUMN "health_certificate_url",
  DROP COLUMN "health_certificate_public_id",
  DROP COLUMN "health_certificate_format";

COMMIT;
