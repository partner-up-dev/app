# Implementation Slices

## Slice 0 - Contract Solidification

Goal: lock the target contract before production code changes.

Work:

- Finalize raw event fields.
- Finalize table replacement strategy.
- Finalize registry entry format.
- Define first event contracts for journey, route, auth session, PR create/join/lifecycle, and Anchor Event context.
- Decide first analytics projections needed to keep existing dashboard working.

Exit proof:

- Updated task packet files.
- Updated durable docs draft plan.
- No production code changed.

## Slice 1 - Backend Schema And Registry

Goal: make the backend own the governed storage and event contracts.

Work:

- Add new Drizzle schema for rebuilt `user_telemetry_journeys`, `user_telemetry_events`, and `user_telemetry_rejected_events`.
- Add migration that renames v1 tables and creates target tables.
- Add event registry module with typed contracts and tests.
- Add schema helpers for attributes / payload validation.

Exit proof:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend test:unit`
- `pnpm db:lint`

## Slice 2 - Data Migration

Goal: migrate all existing user telemetry data into the new shape.

Work:

- Add data migration that transforms v1 journeys, segments, and events.
- Reconstruct journey, identity, route, and segment context events.
- Convert old behavior events into governed raw ledger rows.
- Add migration verification query notes.

Exit proof:

- `pnpm db:lint`
- Local migration run on a copied/dev database.
- Row-count and uniqueness checks documented.

## Slice 3 - Backend Ingest

Goal: make ingest accept only the new governed envelope.

Work:

- Replace `/api/telemetry/user/events` request schema.
- Insert accepted events into `user_telemetry_events`.
- Insert rejected/unregistered/invalid events into `user_telemetry_rejected_events` when applicable.
- Remove old journey/segment upsert semantics from ingest.
- Reject or quarantine events without `journey_id`.
- Add backend request middleware/helper to parse `x-journey-id` into Hono Context for user command routes.
- Keep Problem Details behavior for malformed request envelopes.

Exit proof:

- Backend typecheck.
- Backend unit tests for accepted, duplicate, rejected, and invalid event paths.
- Problem Details lint.

## Slice 4 - Frontend Telemetry Runtime

Goal: emit the new event stream from the browser.

Work:

- Replace old `trackEvent` envelope with governed raw event envelope.
- Generate and persist journey id.
- Emit `journey.started`.
- Emit `route.entered`; define route-left or page-hide behavior if accepted.
- Emit `auth.session.created` context events from session/auth boundaries.
- Remove anonymous id and authenticated hash from ordinary event metadata.
- Remove old segment storage and dedupe path, replacing segment semantics with context events.

Exit proof:

- Frontend unit tests for journey/route event helpers.
- Frontend build.

## Slice 5 - Frontend Business Events

Goal: migrate current product events to governed contracts.

Work:

- Migrate Anchor Event landing / form / list / card events.
- Migrate PR join/waitlist observation and intent events.
- Add missing PR create intent/result coverage for structured and NL paths.
- Add close/status-update command intent/result events.
- Remove old snake_case-to-dot compatibility where no longer needed.

Exit proof:

- Frontend build.
- Focused component/use-case tests where existing tests can assert tracking calls.

## Slice 6 - Backend-Confirmed User Result Events

Goal: emit backend-confirmed user-result events from user command owners.

Work:

- Emit `pr.created` from create/publish owners with clear semantics.
- Emit `pr.joined` and `pr.waitlisted` from participation owners.
- Emit user-caused `pr.closed` from status update owner.
- Read journey context from the controller/Hono boundary and pass typed journey context into emitting use-cases/services.
- Do not emit automatic `pr.expired` into user-behavior telemetry.
- Make event ids idempotent and deterministic enough for retry/re-read paths.

Exit proof:

- Backend unit tests for backend-confirmed user-result event emission.
- Backend typecheck.

## Slice 7 - Enrichment And BI Projection

Goal: make BI read projections, not raw payloads.

Work:

- Build event enrichment logic from raw event + context stream.
- Build identity timeline projection.
- Rebuild Anchor Event funnel query against new event model or projection.
- Add first PR user-result / join funnel query surfaces required by issue #226.
- Source PR lifecycle metrics from business fact data: PR table current statuses or a business-state projection, not user-behavior telemetry.
- Support both PR `created_at` and PR time-window `endAt` as lifecycle cohort dimensions.

Exit proof:

- Backend analytics model tests.
- Existing admin analytics scenario adjusted and passing.

## Slice 8 - Dashboard And Scenario Sweep

Goal: expose stable BI output after data and projection contracts are proven.

Work:

- Update `/admin/analytics` to consume rebuilt analytics endpoints.
- Add or update system scenarios for at least one journey -> backend-confirmed result -> BI query path.
- Promote stable contracts to durable docs.

Exit proof:

- Frontend build.
- Backend typecheck/tests.
- Focused scenario.
- `git diff --check`.
