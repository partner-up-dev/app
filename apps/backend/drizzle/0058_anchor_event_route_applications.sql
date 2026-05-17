CREATE TABLE IF NOT EXISTS "anchor_event_route_applications" (
  "id" bigserial PRIMARY KEY,
  "anchor_event_id" bigint NOT NULL REFERENCES "anchor_events"("id") ON DELETE cascade,
  "route" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "submitted_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "reviewed_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "reviewed_at" timestamp,
  "reject_reason" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "anchor_event_route_applications_event_idx"
  ON "anchor_event_route_applications" ("anchor_event_id");

CREATE INDEX IF NOT EXISTS "anchor_event_route_applications_submitter_idx"
  ON "anchor_event_route_applications" ("submitted_by_user_id", "created_at");

CREATE INDEX IF NOT EXISTS "anchor_event_route_applications_status_idx"
  ON "anchor_event_route_applications" ("status", "created_at");
