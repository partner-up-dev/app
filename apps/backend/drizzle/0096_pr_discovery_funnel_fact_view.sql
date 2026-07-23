-- Typed, Registry-scoped PR Discovery funnel facts.  Keep the raw telemetry
-- ledger private: this view is the dashboard read boundary.
CREATE OR REPLACE VIEW "fact_pr_discovery_funnel_event" AS
SELECT
  e.event_id,
  e.event_name,
  e.event_version,
  e.journey_id,
  e.trace_id,
  e.occurred_at,
  CASE
    WHEN e.event_name = 'pr.discovery.surface.viewed' THEN 'surface_viewed'
    WHEN e.event_name = 'pr.discovery.criteria.submitted' THEN 'criteria_submitted'
    WHEN e.event_name = 'pr.discovery.recommendation.returned' THEN 'recommendation_returned'
    WHEN e.event_name = 'pr.discovery.candidate.impression' THEN 'candidate_impression'
    WHEN e.event_name = 'pr.discovery.candidate.action' THEN 'candidate_action'
    WHEN e.event_name = 'pr.discovery.authoring.handoff' THEN 'authoring_handoff'
  END AS step_key,
  NULLIF(btrim(COALESCE(e.payload ->> 'prType', e.payload ->> 'pr_type')), '') AS pr_type,
  NULLIF(btrim(COALESCE(e.payload ->> 'viewMode', e.payload ->> 'view_mode')), '') AS view_mode,
  NULLIF(btrim(e.payload ->> 'origin'), '') AS origin,
  CASE
    WHEN COALESCE(e.payload ->> 'prId', e.payload ->> 'pr_id') ~ '^[0-9]+$'
      AND length(COALESCE(e.payload ->> 'prId', e.payload ->> 'pr_id')) <= 19
    THEN CASE
      WHEN (COALESCE(e.payload ->> 'prId', e.payload ->> 'pr_id'))::numeric BETWEEN 1 AND 2147483647
      THEN (COALESCE(e.payload ->> 'prId', e.payload ->> 'pr_id'))::integer
      ELSE NULL
    END
    ELSE NULL
  END AS pr_id,
  CASE
    WHEN e.payload ->> 'rank' ~ '^[0-9]+$'
      AND length(e.payload ->> 'rank') <= 10
    THEN CASE
      WHEN (e.payload ->> 'rank')::numeric BETWEEN 1 AND 2147483647
      THEN (e.payload ->> 'rank')::integer
      ELSE NULL
    END
    ELSE NULL
  END AS rank,
  NULLIF(btrim(e.payload ->> 'action'), '') AS action,
  NULLIF(btrim(e.payload ->> 'outcome'), '') AS outcome,
  NULLIF(btrim(COALESCE(e.payload ->> 'handoffReason', e.payload ->> 'handoff_reason')), '') AS handoff_reason,
  route_context.route_path,
  route_context.route_name,
  route_context.spm,
  route_context.source_qr,
  CASE
    WHEN route_context.context_event_id IS NULL THEN 'context_unknown'
    ELSE 'context_complete'
  END AS route_context_status,
  auth_context.anonymous_id,
  auth_context.authenticated_user_hash,
  CASE
    WHEN auth_context.context_event_id IS NULL THEN 'context_unknown'
    ELSE 'context_complete'
  END AS auth_context_status
FROM "user_telemetry_events" e
LEFT JOIN LATERAL (
  SELECT
    r.event_id AS context_event_id,
    NULLIF(COALESCE(r.payload ->> 'routePath', r.payload ->> 'route_path'), '') AS route_path,
    NULLIF(COALESCE(r.attributes ->> 'route_name', r.payload ->> 'routeName', r.payload ->> 'route_name'), '') AS route_name,
    NULLIF(COALESCE(r.attributes ->> 'spm', r.payload ->> 'spm'), '') AS spm,
    NULLIF(COALESCE(r.attributes ->> 'source_qr', r.payload ->> 'sourceQr', r.payload ->> 'source_qr'), '') AS source_qr
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
    NULLIF(COALESCE(a.payload ->> 'authenticated_user_hash', a.payload ->> 'authenticatedUserHash'), '') AS authenticated_user_hash
  FROM "user_telemetry_events" a
  WHERE a.journey_id = e.journey_id
    AND a.event_name = 'auth.session.created'
    AND a.occurred_at <= e.occurred_at
  ORDER BY a.occurred_at DESC, a.event_id DESC
  LIMIT 1
) auth_context ON TRUE
WHERE e.event_version = 1
  AND e.event_name IN (
    'pr.discovery.surface.viewed',
    'pr.discovery.criteria.submitted',
    'pr.discovery.recommendation.returned',
    'pr.discovery.candidate.impression',
    'pr.discovery.candidate.action',
    'pr.discovery.authoring.handoff'
  );
