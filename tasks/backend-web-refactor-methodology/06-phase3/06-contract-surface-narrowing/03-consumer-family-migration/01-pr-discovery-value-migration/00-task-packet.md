# 06C.1 — PR Discovery value migration

## Objective

Move stable PR Discovery/authoring value types from the Backend root entry to
`@partner-up-dev/backend/contracts` in one reviewable family. Keep Hono request/response aliases owned by the 06B
PR contract/query adapters and preserve the existing creation, replay and route-application behavior.

## Exact ownership

The family owns only the paths and symbols listed in [`entry-inventory.md`](entry-inventory.md):
`PartnerRequestFields`, `PRAllowEditAfterReady`, `PRRoute`, `PRRoutePoint`, `PRStatus` (creation result only), and
`WeekdayLabel`. `PRId` in mixed creation/query files is a compatibility exception and must remain root-imported.
06B query type facades remain intentional until their named UI consumers migrate.

## Rehearsal and stop gates

Follow [`rehearsal.md`](rehearsal.md) in order. Stop if a route payload/result changes, a model/process gains a
runtime client edge, a 06B facade is removed without its consumer list, or a residual root symbol cannot be
classified as one of the listed exceptions. Do not enter PR lifecycle, Admin, Share or Commerce files from this
packet.

## Cheapest verification

Run focused `rg` counts for the owned paths before/after, the PR Discovery model/form tests, then
`pnpm check:type:web` and `pnpm check:build:web`. Run the named scenario only if its test import is edited; no full
System run is required for type-only import moves.

## Status

Complete on 2026-07-17. All frozen safe type edges now resolve through
`@partner-up-dev/backend/contracts`; the only root-package residual is the explicitly retained `PRId` import in
`usePRCreate.ts`. See [`exit-evidence.md`](exit-evidence.md).
