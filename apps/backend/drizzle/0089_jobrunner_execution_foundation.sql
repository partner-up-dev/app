ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "job_version" integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lease_token" text,
  ADD COLUMN IF NOT EXISTS "creation_mode" text NOT NULL DEFAULT 'ONCE',
  ADD COLUMN IF NOT EXISTS "creation_key" text,
  ADD COLUMN IF NOT EXISTS "reservation_state" text,
  ADD COLUMN IF NOT EXISTS "window_start_cursor" bigint,
  ADD COLUMN IF NOT EXISTS "high_water_cursor" bigint,
  ADD COLUMN IF NOT EXISTS "released_at" timestamp,
  ADD COLUMN IF NOT EXISTS "last_disposition" text,
  ADD COLUMN IF NOT EXISTS "last_reason" text;

ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_job_version_check"
  CHECK ("job_version" >= 1) NOT VALID;

ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_creation_mode_check"
  CHECK ("creation_mode" IN ('ONCE', 'ONCE_PER_CAUSE', 'UNTIL_ACKNOWLEDGED')) NOT VALID;

ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_reservation_state_check"
  CHECK (
    "reservation_state" IS NULL
    OR "reservation_state" IN ('HELD', 'RELEASED')
  ) NOT VALID;

ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_creation_metadata_check"
  CHECK (
    (
      "creation_mode" = 'ONCE'
      AND "reservation_state" IS NULL
      AND "window_start_cursor" IS NULL
      AND "high_water_cursor" IS NULL
    )
    OR (
      "creation_mode" = 'ONCE_PER_CAUSE'
      AND "creation_key" IS NOT NULL
      AND "reservation_state" IS NULL
      AND "window_start_cursor" IS NULL
      AND "high_water_cursor" IS NULL
    )
    OR (
      "creation_mode" = 'UNTIL_ACKNOWLEDGED'
      AND "creation_key" IS NOT NULL
      AND "reservation_state" IN ('HELD', 'RELEASED')
      AND "window_start_cursor" IS NOT NULL
      AND "high_water_cursor" IS NOT NULL
      AND "high_water_cursor" >= "window_start_cursor"
    )
  ) NOT VALID;

ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_last_disposition_check"
  CHECK (
    "last_disposition" IS NULL
    OR "last_disposition" IN (
      'SUCCEEDED',
      'SKIPPED',
      'RETRYABLE_FAILURE',
      'PERMANENT_FAILURE'
    )
  ) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS "jobs_once_per_cause_creation_key_uq"
  ON "jobs" ("job_type", "creation_key")
  WHERE "creation_mode" = 'ONCE_PER_CAUSE'
    AND "creation_key" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "jobs_held_creation_reservation_uq"
  ON "jobs" ("job_type", "creation_key")
  WHERE "creation_mode" = 'UNTIL_ACKNOWLEDGED'
    AND "reservation_state" = 'HELD'
    AND "creation_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "jobs_creation_lookup_idx"
  ON "jobs" ("job_type", "creation_mode", "creation_key", "reservation_state");
