# Task Packet - Issue 240 Telemetry Substrate

Parent epic: https://github.com/partner-up-dev/mvp-HA/issues/226

GitHub issue: https://github.com/partner-up-dev/mvp-HA/issues/240

## Input Classification

- Constraint: The telemetry substrate changes while product behavior should remain unchanged.
- Constraint: `user_telemetry_*` remains the bounded context; do not introduce generic `raw_events`.
- Constraint: This is a breaking migration with required data migration for existing telemetry rows.
- Artifact: This packet owns contract, registry, schema, ingest, and migration work for the parent epic.

## Objective & Hypothesis

Build the governed user telemetry substrate that later frontend/backend event production and BI projections can depend on.

Hypothesis: a clean substrate first keeps the rest of #226 from encoding BI semantics in ad-hoc frontend payloads or legacy envelope compatibility.

## Packet Map

- `10-scope.md`: concrete scope and non-goals.
- `20-decisions.md`: inherited and issue-local decisions.
- `30-verification.md`: verification plan.
- `40-implementation-blueprint.md`: implementation sequence and checkpoints.
- `50-v1-to-v2-mapping.md`: concrete legacy data migration mapping.
- `60-implementation-log.md`: implementation and verification completed in this slice.

## Guardrails Touched

- Backend telemetry entity schema: `apps/backend/src/entities/user-telemetry.ts`.
- Backend telemetry ingest: `apps/backend/src/controllers/telemetry.controller.ts`, `apps/backend/src/infra/telemetry/*`.
- Database migration workflow: Drizzle migrations and data migration scripts.
- Future frontend / BI contracts: Event Registry shape and RawUserEvent envelope.

## Current Recommendation

Implemented in this slice. The main output is a stable registry-backed ingest/storage contract:

- unique Event Registry source of truth;
- RawUserEvent envelope with mandatory `journey_id` and optional `trace_id`;
- no `seq`, `correlation_id`, `cause_event_id`, `source`, or `authority`;
- no anonymous id or authenticated user hash on ordinary behavior event metadata / attributes;
- v1 data migrated into new journeys, events, and rejected/quarantined rows where needed.
