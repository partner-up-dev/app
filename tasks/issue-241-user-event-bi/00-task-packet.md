# Task Packet - Issue 241 User Event Migration And BI

Parent epic: https://github.com/partner-up-dev/mvp-HA/issues/226

GitHub issue: https://github.com/partner-up-dev/mvp-HA/issues/241

Substrate dependency: https://github.com/partner-up-dev/mvp-HA/issues/240

## Input Classification

- Intent: Migrate actual user event production and BI reporting to the governed telemetry substrate.
- Constraint: User behavior telemetry remains scoped to user-caused behavior streams.
- Constraint: Program/system lifecycle facts such as automatic `pr.expired` stay outside user telemetry.
- Artifact: This packet owns frontend/backend event migration, enrichment, dashboard readers, and release verification.

## Objective & Hypothesis

Move the product's user-event production and BI queries onto the new registry-backed user telemetry substrate.

Hypothesis: once event production and BI projections share a governed registry and context-stream model, PartnerUp can answer #226 BI questions without duplicating identity, route, or lifecycle state on every behavior event.

## Packet Map

- `10-scope.md`: concrete scope and non-goals.
- `20-decisions.md`: inherited and issue-local decisions.
- `30-verification.md`: verification plan.
- `40-implementation-blueprint.md`: implementation sequence and checkpoints.
- `50-implementation-log.md`: implementation and verification completed in this slice.

## Guardrails Touched

- Frontend telemetry runtime: `apps/frontend/src/shared/telemetry/*`.
- Frontend route and auth/session boundaries.
- Frontend user-command request clients that must attach `x-journey-id`.
- Backend user-command owners for PR create / join / waitlist / close results.
- Analytics projection and dashboard readers: `apps/backend/src/infra/analytics/*`, `/admin/analytics`.
- Cross-unit scenario tests under `tests/scenario/` when behavior crosses frontend and backend.

## Current Recommendation

Partially implemented in this slice, on top of #240. This issue should keep removing old event production paths rather than maintain dual envelopes, because #226 is intentionally a breaking release train.
