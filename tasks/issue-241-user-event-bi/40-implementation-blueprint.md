# Implementation Blueprint

This issue depends on #240. It should migrate actual event production and BI readers onto the governed substrate. Do not start production edits until the user explicitly says to start implementation.

## Phase 1: Confirm Substrate Contract

Before editing frontend/backend event production, confirm #240 has landed or is available in the same branch:

- Event Registry module exists and includes the required context / PR result events.
- Ingest accepts the new RawUserEvent envelope.
- `journey_id` is mandatory.
- optional `trace_id` is supported.
- `x-journey-id` is parsed into backend request context.
- v1 compatibility is not required except migrated historical data.

Checkpoint:

- if any substrate contract changes during implementation, update #240 packet first and then adjust this issue.

## Phase 2: Frontend Runtime Migration

Replace the frontend telemetry runtime around the new envelope:

- generate and persist current `journey_id`;
- emit `journey.started` when a new application activity session starts;
- emit `journey.ended` when lifecycle / idle rules can do so reliably;
- emit `route.entered` and `route.left` from router lifecycle;
- emit `auth.session.created` from auth/session boundaries;
- keep anonymous id and authenticated user hash out of ordinary behavior events;
- remove legacy segment tracking;
- attach `x-journey-id` to user command requests.

Checkpoint:

- route and auth/session context must be event-stream facts, not copied onto each behavior event.

## Phase 3: Product Event Migration

Migrate existing user behavior events to registry-governed names and payloads:

- preserve only behavior facts that are useful for #226 BI questions;
- split view, click, command submission, and backend-confirmed result event names clearly;
- use `attributes` for low-cardinality BI dimensions;
- use `payload` for event-owned business facts such as PR id or anchor event type;
- do not put technical correlation fields into user telemetry.

PR paths to cover:

- create: view / intent / submission / `pr.created` / frontend-observed failed or blocked result payload;
- join: view / intent / submission / `pr.joined` / frontend-observed failed or blocked result payload;
- waitlist: intent / submission / `pr.waitlisted` / frontend-observed failed or blocked result payload;
- close: intent / submission / `pr.closed` when user-caused.

Non-goal:

- automatic `pr.expired` must not be emitted into user telemetry.

## Phase 4: Backend-Confirmed User Results

Add backend user-result emission at command owners, not at arbitrary transport edges:

- PR create confirmed by the backend emits `pr.created`;
- PR join confirmed by the backend emits `pr.joined`;
- PR waitlist confirmed by the backend emits `pr.waitlisted`;
- user-caused close confirmed by the backend emits `pr.closed`;
- dedicated backend failed-result events wait for a confirmed naming and failure taxonomy.

Use the typed journey context passed from controllers. If journey context is missing, the user telemetry event should not be accepted as a normal user-behavior event.

Checkpoint:

- backend result events should describe user-command outcomes, not automatic business lifecycle facts.

## Phase 5: Enrichment And BI Readers

Build the projection layer:

- enrich raw events by `journey_id + occurred_at` using context events;
- project `dim_event` from the unique Event Registry;
- build identity/session projection by looking backward to nearest prior `auth.session.created`;
- surface missing context as `context_unknown` or `context_incomplete`;
- avoid reconstructing BI from old telemetry envelope fields.

Rebuild BI queries:

- 3 / 5 / 7 day and arbitrary-window retention by UV;
- per-user PR count;
- PR create / join funnels;
- anchor-event transition;
- "view other activities" conversion;
- PR lifecycle metrics from PR business fact data / current statuses, using `created_at` and PR time-window `endAt` cohort dimensions.

Checkpoint:

- PR close / expire / formed lifecycle metrics must not use user telemetry as their source of truth.

## Phase 6: Dashboard And Code Removal

Update `/admin/analytics` and any dashboard readers to use the new projections.

Remove or retire:

- old frontend telemetry envelope code;
- legacy segment tracking;
- old analytics readers that depend on v1 fields;
- temporary compatibility paths that are not needed after data migration.

V1 telemetry tables are migration-only staging surfaces. After backfill verification, they should be dropped by a forward-only cleanup migration; production readers must only depend on target `user_telemetry_*` tables and migrated legacy context events such as `segment.started`.

## Phase 7: Verification And Staging

Add focused tests for:

- frontend journey lifecycle;
- route context events;
- `auth.session.created`;
- request `x-journey-id` propagation;
- backend-confirmed PR results;
- absent `pr.expired` user telemetry;
- enriched context reconstruction;
- BI query outputs for the required metrics.

Run verification from the repo root:

- `pnpm test:unit:frontend`
- `pnpm test:unit:backend`
- `pnpm test:scenario:backend` where backend command/result flows are covered
- `pnpm test:scenario:system` or targeted cross-unit scenario tests if frontend-to-backend telemetry is exercised
- dashboard smoke verification after staging deploy from `develop`

## Review Boundary

This issue is complete when user event production, enrichment, BI readers, and dashboard surfaces no longer depend on the v1 telemetry envelope and the #226 BI questions are queryable.
