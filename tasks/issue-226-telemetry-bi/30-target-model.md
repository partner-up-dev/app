# Target Model

## Core Principles

1. Raw user telemetry events are the ledger, not the report table.
2. Context is represented by events, not copied into every event row.
3. Identity is represented by `auth.session.created`, not ordinary event metadata.
4. Frontend reports observation and intent.
5. Backend user-command owners may report backend-confirmed user results.
6. Automatic system lifecycle facts belong to program behavior collection or business-state projections.
7. BI reads enriched events and fact projections, not raw frontend payloads.

## Table Family

### `user_telemetry_journeys`

Purpose: minimal journey lifecycle index.

Target fields:

- `journey_id`
- `started_at`
- `ended_at`
- `last_seen_at`
- `created_at`
- `updated_at`

Notes:

- No anonymous id or authenticated user hash on the journey row.
- Entry route, referrer, device, app version, and identity are context events.

### `user_telemetry_events`

Purpose: raw append-only user telemetry ledger.

Target fields:

- `event_id`
- `event_name`
- `event_version`
- `event_family`
- `journey_id`
- `occurred_at`
- `received_at`
- `attributes`
- `payload`
- `trace_id`
- `created_at`

Constraints:

- Unique `event_id`.
- `journey_id` is required for accepted user-behavior events.
- `attributes` is low-cardinality BI/filter metadata.
- `payload` is event-owned business data.
- `occurred_at` is the canonical event time.
- `received_at` is ingest time.
- No global journey-local sequence is required.
- `trace_id` is optional and exists only to join user behavior with program behavior collection / software observability data.
- No `correlation_id` or `cause_event_id` is required in user-behavior telemetry.

## Ordering Semantics

- Raw events do not guarantee a strict total order inside a journey.
- Enrichment uses `occurred_at` to apply context events over time.
- Funnels use registry-defined step order and event stream semantics, not physical row order.
- If multiple events have the same `occurred_at`, projection code may use deterministic tie-breakers such as context-before-behavior and `event_id` only to keep output stable.
- Those tie-breakers must not be interpreted as business truth.

### `user_telemetry_rejected_events`

Purpose: quarantine invalid or unregistered ingest payloads.

Target fields:

- `id`
- `received_at`
- `raw_payload`
- `validation_error`
- `schema_version`

### Removed Table

- Delete `user_telemetry_segments`.
- Re-express segment meaning through context events such as `segment.started`, `segment.ended`, or event-specific context events.

## Registry Contract

Each event contract should define:

- `event_name`
- `event_family`
- `event_version`
- trigger condition
- non-trigger condition
- owner
- attributes schema
- payload schema
- PII / consent class
- deprecation / replacement
- BI mapping

## First Event Families

- `journey.lifecycle`
- `route.lifecycle`
- `auth.session`
- `anchor_event.discovery`
- `pr.create`
- `pr.join`
- `pr.user_result`

## Out Of User-Behavior Scope

- Automatic `pr.expired` and other system lifecycle facts are not user-behavior telemetry events.
- Program-internal collection should own those facts if BI needs event-style lifecycle evidence.
- PR lifecycle BI can read durable business fact data directly. Current close / expire / formed metrics should be based on PR table status rows or a business-state projection, not user telemetry.
- PR lifecycle BI should expose both PR `created_at` and PR time-window `endAt` as cohort dimensions.

## Identity Context

- The first identity context event is `auth.session.created`.
- BI identity enrichment finds the nearest prior `auth.session.created` in the journey event stream.
- Do not introduce `identity.changed` without a concrete future BI query that cannot be served by session-created context.

## Journey Request Context

- Frontend user command requests carry the current journey through `x-journey-id`.
- Backend request middleware parses and validates `x-journey-id` into Hono request context.
- Controllers can read the typed journey context from Hono Context.
- Domain use-cases/services that emit backend-confirmed user-result events should receive a typed journey context argument from the controller boundary rather than importing Hono directly.
