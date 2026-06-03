# Task Packet - Issue 226 Telemetry And BI Foundation

## Input Classification

- Intent: Improve user-behavior collection and BI reporting so PartnerUp can verify L1:re2, especially whether users organize activities naturally and repeat over time.
- Constraint: Product behavior should not change for this slice. The technical substrate for telemetry, enrichment, and BI projection changes.
- Constraint: User-behavior collection should stay scoped to user-caused behavior chains. System lifecycle facts belong to program behavior collection or business-state projections.
- Constraint: Existing Anchor Event funnel telemetry and `/admin/analytics` are live contracts and should not be broken while the foundation evolves.
- Artifact: This packet records exploration, decisions, slice boundaries, and verification evidence for a larger multi-step implementation.

## Objective & Hypothesis

Build a maintainable telemetry -> enrichment -> BI projection mechanism that keeps raw events append-only and replayable, while allowing BI to query stable enriched / fact projections instead of ad-hoc frontend payloads.

Hypothesis: because user-behavior telemetry and BI are still early-stage, the safest long-term path is a clean breaking migration of the current `user_telemetry_*` v1 into a governed raw-event substrate, instead of introducing a separate generic `raw_events` table or preserving a long-lived compatibility envelope.

## Packet Map

- `10-decisions.md`: accepted decisions and open decisions.
- `20-current-state.md`: current frontend/backend telemetry and BI evidence.
- `30-target-model.md`: target user telemetry model, event registry, and table-family shape.
- `40-migration-strategy.md`: schema/data/code migration strategy.
- `50-implementation-slices.md`: planned implementation sequence.
- `60-verification.md`: verification and regression guard plan.
- `70-github-issue-body.md`: current GitHub issue body draft used for issue update.
- `80-global-review.md`: global risk and decision review.
- `90-sub-issue-proposal.md`: proposed GitHub sub-issue split; not created until user confirms.

## Guardrails Touched

- Product analytics and BI contract: `docs/20-product-tdd/cross-unit-contracts.md`, `docs/40-deployment/observability.md`.
- Frontend telemetry substrate: `apps/frontend/src/shared/telemetry/*`, router lifecycle, PR create / join / waitlist / close surfaces.
- Backend telemetry substrate: `apps/backend/src/entities/user-telemetry.ts`, `apps/backend/src/controllers/telemetry.controller.ts`, `apps/backend/src/infra/telemetry/*`.
- Backend-confirmed user-result sources: user-caused PR create / publish / join / waitlist / status update use-cases.
- Analytics projection boundary: `apps/backend/src/infra/analytics/*`, `/api/analytics/*`, `/admin/analytics`.
- Database migration workflow: forward-only Drizzle migrations and optional data migrations.

## Current Recommendation

Treat issue #226 as an epic-sized foundation change. The first reviewable mutation should be:

- document the canonical RawEvent and registry contract;
- add a governed registry module and tests;
- perform a clean breaking migration of `user_telemetry_*` into the governed ingest/storage path, with data migration for existing rows;
- add `event_version`, `event_family`, `attributes`, and `payload`;
- move anonymous id / authenticated user hash into identity context events and identity projection rather than event metadata;
- emit `journey.started` and `route.entered` from frontend;
- rebuild existing BI readers against the new projection path rather than carrying old event shape compatibility.

This avoids reinforcing the current weakness: BI semantics depending on frontend result events and duplicated context fields.

## Discussion Log

### 2026-05-21

- Opened GitHub issue #226 and confirmed acceptance criteria.
- Read current telemetry / analytics docs and relevant frontend / backend constraints.
- Spawned frontend and backend explorers to avoid losing context.
- Backend finding: current system has user telemetry v1 but lacks RawEvent ledger, registry, backend-confirmed user-result events, validation quarantine, enrichment pipeline, and BI fact/dim projection tables.
- Frontend finding: current `trackEvent` and journey system are centralized, but lacks explicit context events, event versions, registry governance, and complete create / close funnel coverage.
- Initial recommendation: do not start by adding dashboard metrics. Start by solidifying raw ledger + registry + journey lifecycle, then add backend-confirmed user-result events and projections.

### 2026-05-21 - User Decisions

- Continue using the `user_telemetry_*` table family instead of introducing a generic `raw_events` table.
- Existing user telemetry data should be fully migrated into the new user telemetry shape through a data migration.
- Anonymous id and authenticated user hash should not be retained in event metadata / attributes. Identity should be expressed through context events such as user login or auth session creation.
- Other high-level judgments are accepted, but product design and technical decisions should continue to be confirmed step by step.
- Existing user event collection implementation must be migrated: some code will be removed, some updated, and compatibility must be explicit.

### 2026-05-21 - Breaking Migration Direction

- User recommends a one-time breaking migration because user behavior collection and BI are still early-stage.
- Decision direction: avoid leaving long-lived compatibility debt. Rebuild the user telemetry schema, ingest contract, collection code, and BI readers around the governed model.
- Keep the `user_telemetry_*` family as the bounded context name, but allow destructive schema replacement through forward-only migrations and data backfill.
- Do not preserve `app_journey_id` as the canonical contract name if `journey_id` is the target vocabulary.

### 2026-05-21 - Packet Structure

- User requested avoiding a task-packet monofile.
- Split durable discussion into focused packet files listed in Packet Map.

### 2026-05-21 - Sequence Decision

- User challenged mandatory journey-local `seq`.
- Decision direction: do not require global journey-local sequence numbers. Backend-confirmed user-result events may need to share `journey_id` with frontend-caused commands, and strict per-journey sequence would create unnecessary distributed coordination.
- Use `occurred_at` as canonical event time, `received_at` as ingest time, and `event_id` for idempotence.
- Projection/enrichment may use deterministic tie-break rules for stable query output, but those tie-breakers are not business-order truth.

### 2026-05-21 - Causal And System Fact Boundary

- User rejected `correlation_id` and `cause_event_id` for user-behavior telemetry. Causal context should not be copied to every behavior event.
- User does not recommend raw event fields `source` or `authority`.
- Automatic system facts such as `pr.expired` should not be collected in the user-behavior system. They belong to program behavior collection or business-state projection.
- User-behavior telemetry should focus on user-caused event streams; BI may combine those streams with program behavior and business tables.

### 2026-05-21 - Release Train And Finalized High-Level Boundaries

- Keep `trace_id` on user-behavior telemetry events so user-behavior collection can be joined with program-behavior collection / software observability.
- Slices 1-7 should land together on `develop`; pushing `origin/develop` deploys staging backend and frontend.
- Maintain one unique Event Registry.
- PR lifecycle BI should query business fact data, especially current PR table statuses. Cohorts use PR `created_at` and PR time-window `endAt`.
- Backend-confirmed successful user-result event names use direct past tense, for example `pr.joined` instead of `pr.join_confirmed`.
- Identity context currently only needs `auth.session.created`; BI should look backward to the nearest session-created event rather than replaying a created-to-changed identity timeline.
- Breaking changes are acceptable except for the required data migration.
- Sub-issues may be created, but the split must be confirmed before creating them.

### 2026-05-21 - Sub-Issue Creation

- Created #240 for telemetry substrate, registry, storage, ingest, and data migration.
- Created #241 for user event migration, BI projections, dashboard, and release verification.
- Created independent task packets:
  - `tasks/issue-240-telemetry-substrate/`
  - `tasks/issue-241-user-event-bi/`

### 2026-05-21 - Journey Generation Confirmation

- The current `journey_id` generation mechanism is accepted.
- The frontend generates a UUID journey id and persists it in tab-scoped `sessionStorage`.
- The journey is created lazily on first telemetry event and reused until 30 minutes of inactivity.
- A new browser tab creates an independent journey.
- Login/logout/auth refresh does not restart the journey by itself.
- Backend request handlers consume `x-journey-id` but do not generate orphan user journeys when it is missing or invalid.
- `journey.ended` and `route.left` remain registered context events, but current BI verification does not require emitting them.
