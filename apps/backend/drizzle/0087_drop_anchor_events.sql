-- Destructive cleanup must fail closed when production data still needs an
-- explicit owner decision. These checks intentionally run again at cutover;
-- the earlier read-only audit is evidence, not a substitute for enforcement.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "anchor_events"
    WHERE "status" = 'ACTIVE'
      AND "type" <> btrim("type")
  ) THEN
    RAISE EXCEPTION 'Anchor Event cleanup blocked: ACTIVE type contains surrounding whitespace';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "anchor_events"
    WHERE "status" = 'ACTIVE'
    GROUP BY lower(btrim("type"))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Anchor Event cleanup blocked: ACTIVE rows have duplicate normalized PR types';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "anchor_events" ae
    LEFT JOIN "pr_type_configs" config ON config."type" = ae."type"
    WHERE ae."status" = 'ACTIVE'
      AND config."type" IS NULL
  ) THEN
    RAISE EXCEPTION 'Anchor Event cleanup blocked: an ACTIVE row was not migrated to PR type configuration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "anchor_events" ae
    INNER JOIN "partner_requests" pr ON pr."type" = ae."type"
    WHERE ae."status" <> 'ACTIVE'
      AND pr."status" IN ('DRAFT', 'OPEN', 'READY', 'ACTIVE')
  ) THEN
    RAISE EXCEPTION 'Anchor Event cleanup blocked: a non-terminal PR still depends on a non-ACTIVE type';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "anchor_event_preference_tags" tag
    INNER JOIN "anchor_events" ae ON ae."id" = tag."anchor_event_id"
    WHERE ae."status" <> 'ACTIVE'
      AND tag."status" = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'Anchor Event cleanup blocked: a non-ACTIVE type has pending preference tags';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "anchor_event_route_applications" old
    LEFT JOIN "pr_type_route_applications" migrated
      ON migrated."id" = old."id"
    WHERE migrated."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'PR type cleanup blocked: a route application was not safely migrated';
  END IF;
END $$;

-- PR creation analytics now follows the canonical authoring entrypoints and
-- creation-source vocabulary. Historical Anchor Event telemetry is excluded
-- from the current fact contract instead of remaining as a compatibility path.
CREATE OR REPLACE VIEW "fact_pr_create_funnel_event" AS
SELECT
  e.event_id,
  e.event_name,
  e.event_version,
  e.journey_id,
  e.trace_id,
  e.occurred_at,
  route_context.route_path,
  route_context.route_name,
  route_context.spm,
  route_context.source_qr,
  auth_context.anonymous_id,
  auth_context.authenticated_user_hash,
  CASE
    WHEN route_context.context_event_id IS NULL THEN 'context_unknown'
    ELSE 'context_complete'
  END AS route_context_status,
  CASE
    WHEN auth_context.context_event_id IS NULL THEN 'context_unknown'
    ELSE 'context_complete'
  END AS auth_context_status,
  CASE
    WHEN e.event_name IN (
      'home.create.entry.click',
      'pr.discovery.authoring.handoff'
    ) THEN 'create_entry_intent'
    WHEN e.event_name = 'pr.create.result'
      AND COALESCE(e.payload ->> 'actionResult', e.payload ->> 'action_result') = 'success'
      THEN 'frontend_create_success'
    WHEN e.event_name = 'pr.created' THEN 'backend_created'
    ELSE NULL
  END AS step_key,
  CASE
    WHEN e.event_name <> 'pr.created' THEN NULL
    WHEN COALESCE(e.payload ->> 'creation_path', e.payload ->> 'creationPath') IN (
      'structured_form',
      'pr_discovery',
      'natural_language'
    ) THEN COALESCE(e.payload ->> 'creation_path', e.payload ->> 'creationPath')
    ELSE 'unknown'
  END AS creation_path
FROM "user_telemetry_events" e
LEFT JOIN LATERAL (
  SELECT
    r.event_id AS context_event_id,
    NULLIF(COALESCE(r.payload ->> 'routePath', r.payload ->> 'route_path'), '') AS route_path,
    NULLIF(
      COALESCE(
        r.attributes ->> 'route_name',
        r.payload ->> 'routeName',
        r.payload ->> 'route_name'
      ),
      ''
    ) AS route_name,
    NULLIF(COALESCE(r.attributes ->> 'spm', r.payload ->> 'spm'), '') AS spm,
    NULLIF(
      COALESCE(
        r.attributes ->> 'source_qr',
        r.payload ->> 'sourceQr',
        r.payload ->> 'source_qr'
      ),
      ''
    ) AS source_qr
  FROM "user_telemetry_events" r
  WHERE r.journey_id = e.journey_id
    AND r.event_name = 'route.entered'
    AND r.occurred_at <= e.occurred_at
  ORDER BY r.occurred_at DESC, r.event_id DESC
  LIMIT 1
) route_context ON TRUE
LEFT JOIN LATERAL (
  SELECT
    a.event_id AS context_event_id,
    NULLIF(COALESCE(a.payload ->> 'anonymous_id', a.payload ->> 'anonymousId'), '') AS anonymous_id,
    NULLIF(
      COALESCE(
        a.payload ->> 'authenticated_user_hash',
        a.payload ->> 'authenticatedUserHash'
      ),
      ''
    ) AS authenticated_user_hash
  FROM "user_telemetry_events" a
  WHERE a.journey_id = e.journey_id
    AND a.event_name = 'auth.session.created'
    AND a.occurred_at <= e.occurred_at
  ORDER BY a.occurred_at DESC, a.event_id DESC
  LIMIT 1
) auth_context ON TRUE
WHERE e.event_version = 1
  AND e.event_name IN (
    'home.create.entry.click',
    'pr.discovery.authoring.handoff',
    'pr.create.result',
    'pr.created'
  );

-- These facts describe the removed domain and have no current owner. Drop
-- without CASCADE so an unaccounted downstream dependency aborts the rollout.
DROP VIEW IF EXISTS "fact_anchor_event_funnel_event";
DROP VIEW IF EXISTS "fact_anchor_event_funnel_segment";
DROP VIEW IF EXISTS "fact_anchor_event_transition_event";
DROP VIEW IF EXISTS "fact_view_other_anchor_events_conversion_event";
DROP VIEW IF EXISTS "fact_official_account_follow_nudge_event";

DELETE FROM "config"
WHERE "key" LIKE 'anchor_event:%';

DROP TABLE IF EXISTS "anchor_event_route_applications";
DROP TABLE IF EXISTS "anchor_event_preference_tags";
DROP TABLE IF EXISTS "anchor_events";
