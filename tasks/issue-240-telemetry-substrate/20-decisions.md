# Decisions

## Inherited From Issue 226

- Continue using `user_telemetry_*`; do not introduce `raw_events`.
- Use breaking changes and avoid backward compatibility debt, except for the required data migration.
- Accepted user behavior events require `journey_id`.
- Keep optional `trace_id` so user behavior can join with program behavior / observability.
- Do not add `seq`, `correlation_id`, `cause_event_id`, `source`, or `authority`.
- Do not keep anonymous id or authenticated user hash on ordinary event metadata / attributes.
- Identity context currently uses `auth.session.created`.
- `user_telemetry_segments` should not survive as a target table; segment meaning moves into context events.
- Hono request context owns parsed `x-journey-id`; controllers pass typed journey context into use-cases/services.

## Open For This Issue

1. Exact replacement-table migration sequence and backup table retention policy.
2. Exact v1-to-v2 mapping for each currently emitted event name.
3. First failed-result event naming convention.
4. Registry module placement and generated `dim_event` projection boundary.
