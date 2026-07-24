ALTER TABLE "jobs"
  DROP COLUMN IF EXISTS "early_tolerance_ms",
  DROP COLUMN IF EXISTS "late_tolerance_ms";
