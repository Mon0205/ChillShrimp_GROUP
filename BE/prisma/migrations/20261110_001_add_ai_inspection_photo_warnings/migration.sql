-- Keep the capture-quality warnings returned by AI_SERVICE so users can judge each count.
-- NULL means the inspection was analysed before this column existed (or not analysed yet).
ALTER TABLE "ai_inspections"
  ADD COLUMN "photo_warnings" JSONB;

ALTER TABLE "ai_inspections"
  ADD CONSTRAINT "ai_inspections_photo_warnings_array_check"
    CHECK ("photo_warnings" IS NULL OR jsonb_typeof("photo_warnings") = 'array');
