# 06A — Types-only Surface

## Objective

Add one explicit Backend package subpath for stable cross-unit value and contract types. Keep `AppType` available
from the Backend root during this subtask, and do not expose Drizzle rows, repositories, internal services, runtime
schemas or a second handwritten DTO authority through the new subpath.

## Owned Surface

- `apps/backend/package.json` package `exports` and one narrow Backend type entrypoint whose exact path is frozen in
  the entry inventory before mutation.
- Type-only re-exports from already-public domain contract/value owners that pass the classification below.
- A focused type-resolution probe or existing compile-time fixture needed to prove the package subpath.

No Web consumer migration, Backend root-export deletion, HTTP route/controller change or domain implementation move
belongs to 06A.

## Entry Information

- `3-5` must have exited with stable Backend public surfaces; otherwise this subtask remains Planned.
- Refresh every `@partner-up-dev/backend` consumer, grouped as `AppType`, stable value/brand, entity/Drizzle row,
  runtime schema/constant and request/response alias. Record exact symbols and paths before choosing the subpath
  contents.
- Confirm current package export resolution, Backend/Web tsconfig reachability and build entry behavior. At planning
  time the package exposes only `.` from `src/index.ts`; this is an observation to recheck, not an execution claim.
- Classify each proposed symbol by its durable owner and runtime requirement. Absence of an owner keeps that symbol
  out of the surface.

## Fork / Stop Conditions

- If a candidate is an entity row, repository/service type or mutable persistence shape, keep it private and return
  to owner-contract design; do not re-export it for migration convenience.
- If the proposed subpath emits or imports runtime code, stop and narrow the entrypoint rather than creating a new
  runtime Backend dependency in Web.
- If package resolution requires changing route output, product semantics, schema/migration or build topology
  beyond a type entrypoint, stop and fork that concern to its owner.
- If `3-5` leaves an unstable compatibility symbol, retain the root compatibility export and name its removal gate;
  do not guess the final contract.

## Low-cost Verification

- Review the explicit export list and use focused `rg` probes to prove it contains no entity row, repository,
  internal service, wildcard export or runtime value.
- Resolve/import every proposed symbol through the new subpath in a compile-time probe.
- Run `pnpm check:type:backend` and `pnpm check:type:web`; run Backend/Web build after the coherent package-export
  batch because editor-only resolution is insufficient evidence.
- Record typecheck duration as information only; it is not a pass threshold unless separately adopted.

## Status

Complete on 2026-07-17. The explicit `@partner-up-dev/backend/contracts` types-only surface, package export and
Web/System resolver mappings are proven in [`exit-evidence.md`](./exit-evidence.md). The first surface excludes
persistence-derived `PRId` and Commerce's persistence-shaped `OrderingOfferDetail`.
