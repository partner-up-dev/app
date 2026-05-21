# Implementation Blueprint

This issue should be implemented before #241. It creates the substrate that later event production and BI readers use. Do not start production edits until the user explicitly says to start implementation.

## Phase 1: Evidence And Local Ownership

Read the local owners before editing:

- root `AGENTS.md`
- `apps/backend/AGENTS.md`
- relevant docs under `docs/20-product-tdd/` and `docs/40-deployment/`
- current backend telemetry schema, ingest service, controller, migrations, and tests

Inventory current telemetry facts:

- current `user_telemetry_*` table columns and indexes;
- current frontend / backend event names sent into `/api/telemetry/user/events`;
- current analytics readers that still depend on the v1 envelope;
- current migration conventions and test database setup.

Checkpoint:

- produce / update the v1-to-v2 event mapping artifact before writing migration SQL.

## Phase 2: Contract And Registry

Define the canonical raw user event contract:

- `event_id`
- `event_name`
- `event_version`
- `journey_id`
- `occurred_at`
- optional `trace_id`
- optional `event_family`
- optional `attributes`
- optional `payload`

Explicitly exclude from accepted event envelope:

- `seq`
- `correlation_id`
- `cause_event_id`
- `source`
- `authority`
- anonymous id
- authenticated user hash

Create a single Event Registry source of truth in code. The registry should own:

- event name;
- event family;
- version;
- event kind: context / observation / intent / command_result;
- owner;
- trigger condition and forbidden condition;
- attributes schema;
- payload schema;
- PII / consent classification;
- BI usage.

Initial registry entries should include at least:

- `journey.started`
- `journey.ended`
- `route.entered`
- `route.left`
- `auth.session.created`
- PR result event names needed by #241, including `pr.created`, `pr.joined`, `pr.waitlisted`, and `pr.closed`

Checkpoint:

- if failed-result naming is still unresolved, register only the successful result events and leave failed-result entries blocked by a named decision.

## Phase 3: Schema And Data Migration Design

Use a replacement-table migration:

1. Rename v1 tables to backup names:
   - `user_telemetry_journeys_v1`
   - `user_telemetry_segments_v1`
   - `user_telemetry_events_v1`
2. Create new target tables:
   - `user_telemetry_journeys`
   - `user_telemetry_events`
   - `user_telemetry_rejected_events`
3. Do not recreate `user_telemetry_segments`.
4. Recreate indexes and constraints for the new query paths.

Data migration mapping rules:

- old journey rows become new journey rows;
- old identity fields become reconstructed `auth.session.created` context events where possible;
- old segment rows become context events only when the mapping artifact gives them stable semantics;
- otherwise legacy rows are quarantined or marked with explicit migration metadata;
- old event rows become raw ledger events with registry-derived `event_family` and `event_version`;
- preserve `occurred_at` as event time and `received_at` as ingest time where old data has both;
- do not generate or persist a business `seq`.

Checkpoint:

- migration must make loss / quarantine explicit. Silent dropping is not acceptable.

## Phase 4: Backend Ingest And Request Context

Update backend ingest to:

- validate event names and versions against the registry;
- validate attributes / payload against the event contract;
- require `journey_id` for accepted events;
- persist optional `trace_id`;
- deduplicate by `event_id`;
- write invalid or unknown events to `user_telemetry_rejected_events`;
- add ingest-owned fields such as `received_at` and validation failure detail.

Add backend request journey context:

- parse `x-journey-id` at the Hono boundary;
- store parsed journey context on Hono request context;
- let controllers read it;
- pass a typed journey context into use-cases/services that need to emit backend-confirmed user-result events.

Do not import Hono types into domain services.

## Phase 5: Tests And Guardrails

Add focused tests for:

- registry uniqueness and required metadata;
- contract validation;
- invalid-event quarantine;
- idempotent duplicate `event_id` ingest;
- mandatory `journey_id`;
- optional `trace_id` persistence;
- absence of forbidden envelope fields;
- v1-to-v2 data migration;
- `x-journey-id` parsing and typed propagation.

Run backend verification from the repo root:

- `pnpm test:unit:backend`
- targeted migration / scenario tests if the repo already has them for telemetry
- `pnpm lint:backend`

## Review Boundary

This issue is complete when #241 can rely on the new registry, ingest path, storage shape, and request journey context without touching the legacy v1 envelope.
