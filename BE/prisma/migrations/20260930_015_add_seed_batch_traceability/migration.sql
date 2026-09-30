ALTER TABLE "seed_batches"
  ADD COLUMN "health_certificate_public_id" VARCHAR(100),
  ADD COLUMN "health_certificate_format" VARCHAR(10);

CREATE TABLE "seed_quality_checks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "checked_by" TEXT NOT NULL,
    "check_type" VARCHAR(30) NOT NULL,
    "disease_code" VARCHAR(20),
    "sample_size" INTEGER NOT NULL,
    "live_count" INTEGER,
    "abnormal_count" INTEGER,
    "survival_rate" DECIMAL(5,2),
    "deformity_rate" DECIMAL(5,2),
    "length_min_mm" DECIMAL(8,3),
    "length_max_mm" DECIMAL(8,3),
    "uniformity_score" DECIMAL(5,2),
    "test_method" VARCHAR(100) NOT NULL,
    "protocol_parameters" JSONB,
    "result" VARCHAR(20) NOT NULL,
    "lab_name" VARCHAR(150),
    "evidence_url" TEXT,
    "evidence_public_id" VARCHAR(100),
    "evidence_format" VARCHAR(10),
    "checked_at" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "review_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_quality_checks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seed_quality_checks_batch_id_fkey"
      FOREIGN KEY ("batch_id") REFERENCES "seed_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "seed_quality_checks_checked_by_fkey"
      FOREIGN KEY ("checked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "seed_quality_checks_reviewed_by_fkey"
      FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "seed_quality_checks_type_check"
      CHECK ("check_type" IN ('visual', 'deformity', 'salinity_stress', 'formalin_stress', 'microscopy', 'pcr')),
    CONSTRAINT "seed_quality_checks_disease_check"
      CHECK ("disease_code" IS NULL OR "disease_code" IN ('WSSV', 'TSV', 'YHV', 'IMNV', 'IHHNV', 'AHPND', 'EHP')),
    CONSTRAINT "seed_quality_checks_pcr_disease_check"
      CHECK ("check_type" <> 'pcr' OR "disease_code" IS NOT NULL),
    CONSTRAINT "seed_quality_checks_result_check"
      CHECK ("result" IN ('pass', 'warning', 'fail', 'inconclusive')),
    CONSTRAINT "seed_quality_checks_review_status_check"
      CHECK ("review_status" IN ('pending', 'confirmed', 'action_required', 'resolved')),
    CONSTRAINT "seed_quality_checks_sample_size_check" CHECK ("sample_size" > 0),
    CONSTRAINT "seed_quality_checks_live_count_check"
      CHECK ("live_count" IS NULL OR "live_count" BETWEEN 0 AND "sample_size"),
    CONSTRAINT "seed_quality_checks_abnormal_count_check"
      CHECK ("abnormal_count" IS NULL OR "abnormal_count" BETWEEN 0 AND "sample_size"),
    CONSTRAINT "seed_quality_checks_rate_check"
      CHECK (("survival_rate" IS NULL OR "survival_rate" BETWEEN 0 AND 100)
        AND ("deformity_rate" IS NULL OR "deformity_rate" BETWEEN 0 AND 100)
        AND ("uniformity_score" IS NULL OR "uniformity_score" BETWEEN 0 AND 100)),
    CONSTRAINT "seed_quality_checks_length_check"
      CHECK (("length_min_mm" IS NULL OR "length_min_mm" >= 0)
        AND ("length_max_mm" IS NULL OR "length_max_mm" >= 0)
        AND ("length_min_mm" IS NULL OR "length_max_mm" IS NULL OR "length_min_mm" <= "length_max_mm"))
);

CREATE INDEX "seed_quality_checks_batch_id_checked_at_idx"
  ON "seed_quality_checks"("batch_id", "checked_at");
CREATE INDEX "seed_quality_checks_checked_by_idx"
  ON "seed_quality_checks"("checked_by");

CREATE TABLE "batch_quantity_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "from_tank_id" UUID,
    "to_tank_id" UUID,
    "created_by" TEXT NOT NULL,
    "event_type" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "reason" TEXT,
    "reference_type" VARCHAR(30),
    "reference_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_quantity_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "batch_quantity_events_batch_id_fkey"
      FOREIGN KEY ("batch_id") REFERENCES "seed_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "batch_quantity_events_from_tank_id_fkey"
      FOREIGN KEY ("from_tank_id") REFERENCES "ponds_tanks"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "batch_quantity_events_to_tank_id_fkey"
      FOREIGN KEY ("to_tank_id") REFERENCES "ponds_tanks"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "batch_quantity_events_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "batch_quantity_events_type_check"
      CHECK ("event_type" IN ('stocking', 'mortality', 'sale', 'transfer_in', 'transfer_out', 'adjustment')),
    CONSTRAINT "batch_quantity_events_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "batch_quantity_events_reason_check"
      CHECK ("event_type" NOT IN ('mortality', 'adjustment') OR NULLIF(BTRIM("reason"), '') IS NOT NULL)
);

CREATE INDEX "batch_quantity_events_batch_id_occurred_at_idx"
  ON "batch_quantity_events"("batch_id", "occurred_at");
CREATE INDEX "batch_quantity_events_created_by_idx"
  ON "batch_quantity_events"("created_by");
CREATE INDEX "batch_quantity_events_from_tank_id_idx"
  ON "batch_quantity_events"("from_tank_id");
CREATE INDEX "batch_quantity_events_to_tank_id_idx"
  ON "batch_quantity_events"("to_tank_id");

CREATE TABLE "growth_sampling_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "sampled_by" TEXT NOT NULL,
    "sampled_at" TIMESTAMPTZ(6) NOT NULL,
    "method" VARCHAR(20) NOT NULL,
    "sample_count" INTEGER NOT NULL,
    "total_sample_weight_g" DECIMAL(12,3),
    "average_weight_g" DECIMAL(10,4),
    "average_length_mm" DECIMAL(8,3),
    "length_min_mm" DECIMAL(8,3),
    "length_max_mm" DECIMAL(8,3),
    "estimated_quantity" INTEGER,
    "biomass_kg" DECIMAL(12,3),
    "uniformity_score" DECIMAL(5,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_sampling_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "growth_sampling_logs_batch_id_fkey"
      FOREIGN KEY ("batch_id") REFERENCES "seed_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "growth_sampling_logs_sampled_by_fkey"
      FOREIGN KEY ("sampled_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "growth_sampling_logs_method_check" CHECK ("method" IN ('manual', 'ai', 'combined')),
    CONSTRAINT "growth_sampling_logs_sample_count_check" CHECK ("sample_count" > 0),
    CONSTRAINT "growth_sampling_logs_nonnegative_check"
      CHECK (("total_sample_weight_g" IS NULL OR "total_sample_weight_g" >= 0)
        AND ("average_weight_g" IS NULL OR "average_weight_g" >= 0)
        AND ("average_length_mm" IS NULL OR "average_length_mm" >= 0)
        AND ("length_min_mm" IS NULL OR "length_min_mm" >= 0)
        AND ("length_max_mm" IS NULL OR "length_max_mm" >= 0)
        AND ("estimated_quantity" IS NULL OR "estimated_quantity" >= 0)
        AND ("biomass_kg" IS NULL OR "biomass_kg" >= 0)
        AND ("uniformity_score" IS NULL OR "uniformity_score" BETWEEN 0 AND 100)),
    CONSTRAINT "growth_sampling_logs_length_check"
      CHECK ("length_min_mm" IS NULL OR "length_max_mm" IS NULL OR "length_min_mm" <= "length_max_mm")
);

CREATE INDEX "growth_sampling_logs_batch_id_sampled_at_idx"
  ON "growth_sampling_logs"("batch_id", "sampled_at");
CREATE INDEX "growth_sampling_logs_sampled_by_idx"
  ON "growth_sampling_logs"("sampled_by");
