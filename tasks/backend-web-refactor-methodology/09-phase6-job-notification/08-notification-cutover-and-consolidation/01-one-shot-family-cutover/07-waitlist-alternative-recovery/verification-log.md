# `6-3.1g` Verification Log

## Focused Proof

| Proof | Result | Evidence |
| --- | --- | --- |
| Generic owner policy | passed | owner unit verifies private active-only key, channel render, limited credit and exact source-cycle stale fence |
| Pure query | passed | fixed-time unit proves raw `OPEN` is vetoed at the ordinary start or materialized join-lock boundary without invoking a mutation |
| PR reconciler | passed | fake dependency unit verifies strict payload/causation, READY-only request and local discovery dedupe/null-cycle suppression |
| Provider mapping | passed | channel unit proves the distinct business template reuses only the existing waitlist-promoted provider binding |
| Real Postgres current-cycle recovery | passed | `cross_pr_waitlist_alternative_uses_generic_active_job_cycle_and_no_opportunity` proves one active generic task, no Opportunity, re-entry cycle fencing and current-cycle dispatch/credit behavior |
| Legacy pending-row drain | passed | `legacy_waitlist_alternative_pending_row_executes_through_drain_handler` registers and executes an old concrete row, recording its compatibility Delivery result |

## Commands

| Command | Result |
| --- | --- |
| focused backend-unit owner/query/reconciler/channel tests | 4 files, 24 tests passed |
| focused backend scenarios for Job drain and waitlist alternative | 2 files, 14 tests passed |
| `pnpm check:type:backend` | passed |
| `pnpm check:lint:backend` | passed |
| `pnpm test:unit:backend` | 106 files, 478 tests passed; later changes were scenario/docs only |
| `pnpm test:scenario:backend` | 34 files, 119 tests passed after the final legacy-drain scenario was added |
| `pnpm check:build:backend` | passed |
| `git diff --check` plus targeted reverse-edge searches | passed; no source scheduler, Opportunity creation, or temporal-refresh edge remains in the new path |

## Compatibility Boundary

The legacy payload has no `sourceWaitlistCycleId`, so its retained decoder
cannot offer the generic path's exact re-entry fence. It is a finite pending-row
drain only: no new caller creates it, and `6-3.3` owns the archive/drain gate
before its handler, Delivery bridge and recipient-prefix cancellation can be
removed.
