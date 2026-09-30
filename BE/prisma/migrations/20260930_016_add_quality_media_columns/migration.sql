ALTER TABLE "seed_batches"
  ADD COLUMN IF NOT EXISTS "health_certificate_public_id" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "health_certificate_format" VARCHAR(10);

ALTER TABLE "seed_quality_checks"
  ADD COLUMN IF NOT EXISTS "evidence_public_id" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "evidence_format" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "review_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "reviewed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "review_notes" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'seed_quality_checks_reviewed_by_fkey'
      AND conrelid = 'seed_quality_checks'::regclass
  ) THEN
    ALTER TABLE "seed_quality_checks"
      ADD CONSTRAINT "seed_quality_checks_reviewed_by_fkey"
      FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'seed_quality_checks_review_status_check'
      AND conrelid = 'seed_quality_checks'::regclass
  ) THEN
    ALTER TABLE "seed_quality_checks"
      ADD CONSTRAINT "seed_quality_checks_review_status_check"
      CHECK ("review_status" IN ('pending', 'confirmed', 'action_required', 'resolved'));
  END IF;
END $$;
