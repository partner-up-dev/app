# 06D — Root Compatibility Retirement

## Objective

Retire broad Backend root compatibility exports only after all repository consumers have moved to the types-only
surface or a domain-inferred alias. Keep root `AppType` as the transport-owned compile-time HTTP seam unless a
separately authorized transport subpath is proven; do not alter runtime routes or introduce a second DTO truth.

## Owned Surface

- Broad type/schema/value compatibility exports in `apps/backend/src/index.ts` and only the package export metadata
  required to preserve the proven type entrypoints.
- Remaining in-repository root consumers required to reach zero for each retiring symbol, including tests and
  scenario compile-time imports.
- A task-local retirement inventory containing retained `AppType`, removed symbols, exceptions and restoration path.

Controllers, route composition, HTTP behavior, domain implementations and external API versioning are outside 06D.

## Entry Information

- 06C must have completed all authorized families with Backend/Web type/build evidence and no unexplained consumer
  residuals.
- Search production, tests, scripts and package/export surfaces for every retiring root symbol; distinguish
  `AppType`, type-only, runtime value/schema, test-only and possible external consumers.
- Entry requires zero known in-repository consumers for each retiring symbol, or an explicit retained compatibility
  window with owner and removal trigger. A repository search alone is not proof about unknown external consumers.
- Prepare a small restoration patch that restores exports only and requires no schema/data rollback.

## Fork / Stop Conditions

- If a runtime schema/constant still has a consumer, retain it or move that consumer in a separately scoped runtime
  batch; do not treat it as type-only cleanup.
- If an external or unclassified consumer may rely on a root symbol, retain a thin compatibility export and record
  the review trigger rather than claiming retirement.
- If removing exports changes server bundle reachability, Hono inference or route types, restore the compatibility
  export and return to package-boundary analysis.
- If completion requires changing `AppType`, route output, product semantics or CF-01/CF-02 behavior, stop and fork to
  the owning slice.

## Low-cost Verification

- Focused `rg`/AST probes prove each removed symbol has zero in-repository root consumers and that the only allowed
  raw `AppType` imports are transport adapters such as Web RPC client construction.
- Review the root export list for wildcard/internal implementation leaks and verify the new subpath remains
  type-only.
- Run `pnpm check:type:backend`, `pnpm check:type:web`, `pnpm check:build:backend` and `pnpm check:build:web`.
- Finish with architecture-fitness delta and full System because 06D is the cross-unit slice exit; typecheck timing
  remains informational rather than a gate.

## Status

Complete on 2026-07-17. The approved safe type exports were retired after fresh consumer-zero evidence, the Web
component guidance is corrected, and the export-only restoration patch is recorded. Backend/Web type/build, full
Backend/System scenario, diff, and architecture-fitness gates are recorded in [`exit-evidence.md`](exit-evidence.md).
