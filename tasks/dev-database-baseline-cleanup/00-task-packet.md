# Development Database Baseline Cleanup

## Objective & Hypothesis

Objective: clean up the local development database bootstrap model so reset
flows produce a usable operator-authored baseline without creating
business-instance fixtures.

Hypothesis:

- `seeds/` should own local reset baseline records that are intentionally
  rerunnable and not ledgered.
- Anchor Event, POI, support config, and rental catalog rows belong in the
  local baseline seed because they are only for local reset/manual validation.
- The replacement baseline should be development-only for this slice. It must
  not run in staging or production.
- Development baseline data is not production metadata. Production must not
  depend on these records existing.
- The useful baseline is configuration surface area: event pools, location
  pools, catalog SKUs, payment provider instances, ride-hailing provider
  instances, and other records needed for manual creation flows. It should not
  pre-create PRs, orders, bills, message threads, or other per-run business
  state.

## Input Classification

- Type: `Artifact` for this task packet, with a follow-on `Constraint` slice
  before migration edits.
- Active mode: implementation verified.
- Current status: local reset baseline drafted and verified through local reset.

## Guardrails Touched

- Root workflow:
  - `AGENTS.md`
  - `docs/00-meta/bootstrap-workflow.md`
  - `docs/00-meta/input-artifact.md`
  - `docs/00-meta/input-constraint.md`
- Backend migration authority:
  - `docs/30-unit-tdd/backend-migration-ledger.md`
  - `apps/backend/AGENTS.md`
  - `apps/backend/data-migrations/AGENTS.md`
  - `apps/backend/data-migrations/README.md`
  - `apps/backend/seeds/README.md`
- Runtime environment boundary:
  - `docs/40-deployment/environments.md`
  - `docs/40-deployment/backend-runtime.md`
- Candidate code/data surfaces:
  - `apps/backend/seeds/0001_anchor_event_bootstrap.sql`
  - `apps/backend/seeds/0002_admin_user_bootstrap.sql`
  - `apps/backend/data-migrations/0077_dev_ride_hailing_caocao_fixture.sql`
  - `apps/backend/data-migrations/0081_dev_mock_payment_provider_baseline.sql`

## Working Decisions

- Scope is development-only until explicitly changed.
- Staging and production must not receive this baseline in the current slice.
- User-facing seeded record names must avoid words such as "test", "demo", or
  their Chinese equivalents.
- Do not create new branches.
- Do not modify code, seed files, or migrations until the user explicitly says
  to start implementation.
- Development-only migrations may be edited directly for local reset behavior
  when the user explicitly authorizes that direction.

## Candidate Work Breakdown

1. Inventory the current seed and development-only migration records. Done.
2. Decide the minimum development baseline. Done:
   - Anchor Event definitions and event-owned pools.
   - POI records referenced by event location pools.
   - Product SPU/SKU records needed for ordering pages.
   - Local payment provider instance for local checkout.
   - Local ride-hailing provider instance for ride-hailing listing and dispatch
     flows.
3. Move Anchor Event, POI, support config, and rental catalog baseline into
   `seeds/0001_anchor_event_bootstrap.sql`. Done.
4. Keep or rewrite local admin/analytics seed as local-only rerunnable account
   convenience. Drafted in `0002`.
5. Revise existing development-only `0077` and `0081` directly for reset
   baseline behavior. Done:
   - `0077` owns ride-hailing provider and catalog records only.
   - `0081` owns payment provider records only.
6. Decide whether production and staging admin/analytics account creation needs
   a separate secret-driven operational path. Do not commit production
   passwords or hashes into SQL.
7. Update local docs only if future rediscovery cost is high. Local seed README
   updated.

## Evidence

- Current local database export summary:
  `tasks/dev-database-baseline-cleanup/current-db-baseline.md`
- Development-only migrations `0077` and `0081` are edited directly because the
  target workflow is local reset, not production/staging ledger replay.
- `0001` owns the local operator baseline rows that were previously seed-like
  or manually configured.

## Verification

Planned verification before any database mutation:

- `pnpm db:lint` passed.

Planned verification after user approves running SQL:

- `pnpm db:reset:dev` passed.
- Inspect migration output for `environment=development` and expected
  environment skips. Done: `0077` and `0081` applied in development reset.
- Query the reset database for the baseline counts and key records. Done:
  `tasks/dev-database-baseline-cleanup/post-reset-verification.md`
- Run a narrow browser/manual path only if frontend/backend services are needed:
  `pnpm dev:ensure`
