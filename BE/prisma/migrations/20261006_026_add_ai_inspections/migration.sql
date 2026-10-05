CREATE TABLE "ai_inspections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batch_id" UUID NOT NULL,
  "created_by" TEXT NOT NULL,
  "media_url" TEXT NOT NULL,
  "media_public_id" VARCHAR(255) NOT NULL,
  "annotated_image_url" TEXT,
  "sampling_method" VARCHAR(20) NOT NULL,
  "sample_volume_ml" DECIMAL(12,3),
  "manual_count" INTEGER,
  "detected_count" INTEGER,
  "density_per_ml" DECIMAL(14,4),
  "correction_factor" DECIMAL(8,4),
  "average_confidence" DECIMAL(6,5),
  "average_size_mm" DECIMAL(8,3),
  "uniformity_score" DECIMAL(6,3),
  "detections" JSONB,
  "model_version" VARCHAR(100),
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "inspected_at" TIMESTAMPTZ(6),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_inspections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_inspections_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "seed_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_inspections_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_inspections_sampling_method_check"
    CHECK ("sampling_method" IN ('manual', 'ai', 'combined')),
  CONSTRAINT "ai_inspections_status_check"
    CHECK ("status" IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT "ai_inspections_nonnegative_counts_check"
    CHECK (("manual_count" IS NULL OR "manual_count" >= 0) AND
           ("detected_count" IS NULL OR "detected_count" >= 0)),
  CONSTRAINT "ai_inspections_positive_sample_volume_check"
    CHECK ("sample_volume_ml" IS NULL OR "sample_volume_ml" > 0),
  CONSTRAINT "ai_inspections_nonnegative_density_check"
    CHECK ("density_per_ml" IS NULL OR "density_per_ml" >= 0),
  CONSTRAINT "ai_inspections_confidence_range_check"
    CHECK ("average_confidence" IS NULL OR "average_confidence" BETWEEN 0 AND 1),
  CONSTRAINT "ai_inspections_uniformity_range_check"
    CHECK ("uniformity_score" IS NULL OR "uniformity_score" BETWEEN 0 AND 100)
);

CREATE INDEX "ai_inspections_batch_id_inspected_at_idx"
  ON "ai_inspections"("batch_id", "inspected_at" DESC);
CREATE UNIQUE INDEX "ai_inspections_media_public_id_key"
  ON "ai_inspections"("media_public_id");
CREATE INDEX "ai_inspections_created_by_idx"
  ON "ai_inspections"("created_by");
CREATE INDEX "ai_inspections_status_created_at_idx"
  ON "ai_inspections"("status", "created_at");
