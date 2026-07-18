# 06C.3 — Feedback/Admin value migration

## Objective

Migrate the remaining Admin consumer family from Backend root compatibility types to the narrow contracts entry.
Keep Admin query adapters as the transport boundary and preserve the 06B Feedback pilot's inferred aliases.

## Exact ownership

Only the five files and symbols listed in [`entry-inventory.md`](entry-inventory.md) are owned: Admin feedback
questionnaire definitions, Admin PR route values and Admin join-gate configuration values. PR-domain feedback UI is
owned by 06C.2; no Admin composite or broad DTO is to be widened here.

## Rehearsal and stop gates

Follow [`rehearsal.md`](rehearsal.md). Stop if Admin depends on an unstable composite response, if query-owned
facades need to be deleted, or if a route/schema/runtime behavior changes. Record the missing owner and retain the
root compatibility import when a safe contract is not available.

## Cheapest verification

Compare the five-file `rg` counts, run focused Admin feedback/PR unit tests, then `pnpm check:type:web` and
`pnpm check:build:web`. Do not run full System for type-only imports.

## Status

Complete on 2026-07-17. The five frozen Admin feedback/PR value imports now resolve through
`@partner-up-dev/backend/contracts`; no runtime, DTO, route, or query-adapter behavior changed. See
[`exit-evidence.md`](exit-evidence.md).
