CREATE TABLE IF NOT EXISTS "pr_type_configs" (
  "type" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "location_pool" jsonb NOT NULL,
  "route_pool" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "time_pool_config" jsonb NOT NULL,
  "authoring_time_window_editor_default_mode" text DEFAULT 'NORMAL' NOT NULL,
  "default_min_partners" integer,
  "default_max_partners" integer,
  "default_notes" text,
  "default_confirmation_enabled" boolean DEFAULT true NOT NULL,
  "default_confirmation_start_offset_minutes" integer DEFAULT 120 NOT NULL,
  "default_confirmation_end_offset_minutes" integer DEFAULT 30 NOT NULL,
  "default_join_lock_offset_minutes" integer DEFAULT 30 NOT NULL,
  "meeting_point" jsonb DEFAULT 'null'::jsonb,
  "join_gate_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "participation_frequency_limit" jsonb DEFAULT 'null'::jsonb,
  "feedback_questionnaire_template_id" bigint REFERENCES "feedback_questionnaire_templates"("id") ON DELETE SET NULL,
  "location_meeting_points" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "cover_image" text,
  "community_qr_code" text,
  "authoring_creation_policy" text DEFAULT 'USER_AND_ADMIN' NOT NULL,
  "full_capacity_expansion_policy" text DEFAULT 'DISABLED' NOT NULL,
  "discovery_form_ratio" integer DEFAULT 50 NOT NULL,
  "discovery_card_ratio" integer DEFAULT 50 NOT NULL,
  "discovery_list_ratio" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "pr_type_configs_type_nonempty_chk" CHECK (length(btrim("type")) > 0),
  CONSTRAINT "pr_type_configs_place_pool_chk" CHECK (jsonb_array_length("location_pool") = 0 OR jsonb_array_length("route_pool") = 0),
  CONSTRAINT "pr_type_configs_default_partner_bounds_chk" CHECK (
    ("default_min_partners" IS NULL OR "default_min_partners" >= 1)
    AND ("default_max_partners" IS NULL OR "default_max_partners" >= 2)
    AND ("default_min_partners" IS NULL OR "default_max_partners" IS NULL OR "default_max_partners" >= "default_min_partners")
  ),
  CONSTRAINT "pr_type_configs_default_participation_offsets_chk" CHECK (
    "default_confirmation_start_offset_minutes" >= 0
    AND "default_confirmation_end_offset_minutes" >= 0
    AND "default_join_lock_offset_minutes" >= 0
    AND (
      NOT "default_confirmation_enabled"
      OR (
        "default_confirmation_start_offset_minutes" > "default_confirmation_end_offset_minutes"
        AND "default_join_lock_offset_minutes" >= "default_confirmation_end_offset_minutes"
      )
    )
  ),
  CONSTRAINT "pr_type_configs_authoring_creation_policy_chk" CHECK ("authoring_creation_policy" IN ('USER_AND_ADMIN', 'ADMIN_ONLY')),
  CONSTRAINT "pr_type_configs_time_window_editor_default_mode_chk" CHECK ("authoring_time_window_editor_default_mode" IN ('NORMAL', 'FUZZY', 'ADVANCED')),
  CONSTRAINT "pr_type_configs_full_capacity_expansion_policy_chk" CHECK ("full_capacity_expansion_policy" IN ('ENABLED', 'DISABLED')),
  CONSTRAINT "pr_type_configs_discovery_form_ratio_nonnegative_chk" CHECK ("discovery_form_ratio" >= 0),
  CONSTRAINT "pr_type_configs_discovery_card_ratio_nonnegative_chk" CHECK ("discovery_card_ratio" >= 0),
  CONSTRAINT "pr_type_configs_discovery_list_ratio_nonnegative_chk" CHECK ("discovery_list_ratio" >= 0)
);

CREATE TABLE IF NOT EXISTS "pr_type_preference_tags" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "type" text NOT NULL REFERENCES "pr_type_configs"("type") ON DELETE CASCADE,
  "label" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "moderation_status" text DEFAULT 'PENDING' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "pr_type_preference_tags_label_nonempty_chk" CHECK (length(btrim("label")) > 0),
  CONSTRAINT "pr_type_preference_tags_moderation_status_chk" CHECK ("moderation_status" IN ('PENDING', 'PUBLISHED', 'REJECTED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "pr_type_preference_tags_type_label_uidx"
  ON "pr_type_preference_tags" ("type", "label");

CREATE TABLE IF NOT EXISTS "pr_type_route_applications" (
  "id" bigserial PRIMARY KEY,
  "type" text NOT NULL REFERENCES "pr_type_configs"("type") ON DELETE CASCADE,
  "route" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "submitted_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" timestamp,
  "reject_reason" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "pr_type_route_applications_status_chk" CHECK ("status" IN ('PENDING', 'ACCEPTED', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS "pr_type_route_applications_type_idx"
  ON "pr_type_route_applications" ("type", "created_at");
CREATE INDEX IF NOT EXISTS "pr_type_route_applications_submitter_idx"
  ON "pr_type_route_applications" ("submitted_by_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "pr_type_route_applications_status_idx"
  ON "pr_type_route_applications" ("status", "created_at");

-- Only legacy ACTIVE rows become current type configuration. The explicit
-- 50/50/0 defaults preserve the current product ratio vocabulary when no valid
-- landing override exists.
INSERT INTO "pr_type_configs" (
  "type",
  "title",
  "description",
  "location_pool",
  "route_pool",
  "time_pool_config",
  "authoring_time_window_editor_default_mode",
  "default_min_partners",
  "default_max_partners",
  "default_notes",
  "default_confirmation_enabled",
  "default_confirmation_start_offset_minutes",
  "default_confirmation_end_offset_minutes",
  "default_join_lock_offset_minutes",
  "meeting_point",
  "join_gate_config",
  "participation_frequency_limit",
  "feedback_questionnaire_template_id",
  "location_meeting_points",
  "cover_image",
  "community_qr_code",
  "authoring_creation_policy",
  "full_capacity_expansion_policy",
  "discovery_form_ratio",
  "discovery_card_ratio",
  "discovery_list_ratio",
  "created_at",
  "updated_at"
)
SELECT
  "type",
  "title",
  "description",
  "location_pool",
  "route_pool",
  "time_pool_config",
  CASE
    WHEN "pr_time_window_editor_default_mode" IN ('NORMAL', 'FUZZY', 'ADVANCED')
      THEN "pr_time_window_editor_default_mode"
    ELSE 'NORMAL'
  END AS "authoring_time_window_editor_default_mode",
  "default_min_partners",
  "default_max_partners",
  "default_pr_notes" AS "default_notes",
  "default_confirmation_enabled",
  "default_confirmation_start_offset_minutes",
  "default_confirmation_end_offset_minutes",
  "default_join_lock_offset_minutes",
  "meeting_point",
  CASE
    WHEN jsonb_typeof("join_gate_config") = 'array' THEN
      COALESCE(
        (
          SELECT jsonb_agg(
            CASE
              WHEN gate ->> 'source' = 'ANCHOR_EVENT'
                THEN jsonb_set(gate, '{source}', '"PR_TYPE_CONFIG"'::jsonb)
              ELSE gate
            END
            ORDER BY gate_ordinality
          )
          FROM jsonb_array_elements("join_gate_config")
            WITH ORDINALITY AS gates(gate, gate_ordinality)
        ),
        '[]'::jsonb
      )
    ELSE '[]'::jsonb
  END AS "join_gate_config",
  "participation_frequency_limit",
  "feedback_questionnaire_template_id",
  "location_meeting_points",
  "cover_image",
  "beta_group_qr_code" AS "community_qr_code",
  "pr_creation_policy" AS "authoring_creation_policy",
  "full_pr_expansion_policy" AS "full_capacity_expansion_policy",
  50,
  50,
  0,
  "created_at",
  "updated_at"
FROM "anchor_events"
WHERE "status" = 'ACTIVE'
ON CONFLICT ("type") DO NOTHING;

-- Route applications are keyed by the canonical PR type. Preserve IDs so the
-- cutover can prove every legacy row has a corresponding migrated row.
INSERT INTO "pr_type_route_applications" (
  "id", "type", "route", "status", "submitted_by_user_id", "reviewed_by_user_id",
  "reviewed_at", "reject_reason", "created_at", "updated_at"
)
SELECT
  old."id", event."type", old."route", old."status", old."submitted_by_user_id",
  old."reviewed_by_user_id", old."reviewed_at", old."reject_reason", old."created_at", old."updated_at"
FROM "anchor_event_route_applications" old
INNER JOIN "anchor_events" event ON event."id" = old."anchor_event_id"
INNER JOIN "pr_type_configs" config ON config."type" = event."type"
WHERE event."status" = 'ACTIVE'
ON CONFLICT ("id") DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('pr_type_route_applications', 'id'),
  GREATEST(COALESCE((SELECT MAX("id") FROM "pr_type_route_applications"), 0), 1),
  COALESCE((SELECT MAX("id") IS NOT NULL FROM "pr_type_route_applications"), false)
);

-- Preference labels are authoring configuration selected by PR.type. Preserve
-- the strongest moderation decision when duplicate labels exist for one type.
INSERT INTO "pr_type_preference_tags" (
  "type",
  "label",
  "description",
  "moderation_status",
  "created_at",
  "updated_at"
)
SELECT DISTINCT ON (ae."type", tags."label")
  ae."type",
  tags."label",
  tags."description",
  tags."status",
  tags."created_at",
  tags."updated_at"
FROM "anchor_event_preference_tags" tags
INNER JOIN "anchor_events" ae ON ae."id" = tags."anchor_event_id"
INNER JOIN "pr_type_configs" configs ON configs."type" = ae."type"
WHERE ae."status" = 'ACTIVE'
ORDER BY
  ae."type",
  tags."label",
  CASE tags."status"
    WHEN 'PUBLISHED' THEN 0
    WHEN 'PENDING' THEN 1
    ELSE 2
  END,
  tags."updated_at" DESC,
  tags."id" DESC
ON CONFLICT ("type", "label") DO NOTHING;

-- Join-gate acceptance is PR-owned after creation. Existing PR snapshots keep
-- their content/version while provenance moves from the removed Event owner to
-- the PR-type configuration that originally supplied the gate.
UPDATE "partner_requests"
SET "join_gate_config" = COALESCE(
  (
    SELECT jsonb_agg(
      CASE
        WHEN gate ->> 'source' = 'ANCHOR_EVENT'
          THEN jsonb_set(gate, '{source}', '"PR_TYPE_CONFIG"'::jsonb)
        ELSE gate
      END
      ORDER BY gate_ordinality
    )
    FROM jsonb_array_elements("partner_requests"."join_gate_config")
      WITH ORDINALITY AS gates(gate, gate_ordinality)
  ),
  '[]'::jsonb
)
WHERE jsonb_typeof("join_gate_config") = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements("partner_requests"."join_gate_config") AS gate
    WHERE gate ->> 'source' = 'ANCHOR_EVENT'
  );

-- Preserve the current FORM/CARD/LIST ratio override when the legacy config
-- value is valid JSON. assignmentRevision is intentionally not migrated.
-- A malformed or out-of-range value leaves the safe 50/50/0 defaults in place
-- instead of making this additive migration fail.
DO $$
DECLARE
  legacy_config RECORD;
  config_value jsonb;
  ratio_override jsonb;
  form_ratio integer;
  card_ratio integer;
  list_ratio integer;
BEGIN
  FOR legacy_config IN
    SELECT
      ae."type" AS pr_type,
      c."value" AS raw_value
    FROM "anchor_events" ae
    INNER JOIN "config" c
      ON c."key" = 'anchor_event:' || ae."id"::text || ':landing_config'
    WHERE ae."status" = 'ACTIVE'
  LOOP
    BEGIN
      config_value := legacy_config.raw_value::jsonb;

      IF jsonb_typeof(config_value -> 'enabledVariants') = 'array'
        AND NOT ((config_value -> 'enabledVariants') ? 'CARD_RICH') THEN
        form_ratio := 100;
        card_ratio := 0;
        list_ratio := 0;
      ELSE
        ratio_override := config_value -> 'variantRatioOverride';
        IF jsonb_typeof(ratio_override) <> 'object' THEN
          CONTINUE;
        END IF;

        form_ratio := CASE
          WHEN jsonb_typeof(ratio_override -> 'FORM') = 'number'
            AND (ratio_override ->> 'FORM') ~ '^[0-9]+$'
            THEN (ratio_override ->> 'FORM')::integer
          ELSE 0
        END;
        card_ratio := CASE
          WHEN jsonb_typeof(ratio_override -> 'CARD_RICH') = 'number'
            AND (ratio_override ->> 'CARD_RICH') ~ '^[0-9]+$'
            THEN (ratio_override ->> 'CARD_RICH')::integer
          ELSE 0
        END;
        list_ratio := CASE
          WHEN jsonb_typeof(ratio_override -> 'LIST') = 'number'
            AND (ratio_override ->> 'LIST') ~ '^[0-9]+$'
            THEN (ratio_override ->> 'LIST')::integer
          ELSE 0
        END;
      END IF;

      UPDATE "pr_type_configs"
      SET
        "discovery_form_ratio" = form_ratio,
        "discovery_card_ratio" = card_ratio,
        "discovery_list_ratio" = list_ratio
      WHERE "type" = legacy_config.pr_type;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Skipping invalid landing ratio config for PR type %', legacy_config.pr_type;
    END;
  END LOOP;
END $$;
