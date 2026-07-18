# Slice 3-6 — Web Contract Surface Narrowing

## Objective & Hypothesis

Keep Hono `AppType` as the typed HTTP origin while reducing arbitrary Web imports from the Backend root export.
Stable shared value types move behind a types-only contract subpath; response/input aliases remain inferred near
their domain adapters. No handwritten DTO package or runtime client abstraction is introduced.

## Entry / Exit

- Entry: Backend domain public surfaces and compatibility cutovers are stable; current Web type-import inventory complete.
- Exit: raw `AppType` import is transport-owned, selected value types use a narrow types-only surface, handwritten
  response duplicates are removed, Web type/build/System pass and compile-time dependency direction improves.

## Status

Complete on 2026-07-17. `06A`, `06B`, the four original `06C` consumer families, the bounded 06C exit-census
correction, and `06D` have their required type/build, consumer-census, full System, and architecture-fitness evidence.
`PRId` and `OrderingOfferDetail` remain recorded root compatibility exceptions rather than being recast as handwritten
contracts.

## Subtask Index

1. [`06A — Types-only Surface`](01-types-only-surface/00-task-packet.md): classify Backend exports and add one
   narrow, type-only package subpath.
2. [`06B — Inferred Domain Aliases`](02-inferred-domain-aliases/00-task-packet.md): keep Hono inference in Web
   transport/domain adapters and expose aliases without handwritten response DTOs.
3. [`06C — Consumer-family Migration`](03-consumer-family-migration/00-task-packet.md): complete, including one
   exit-census correction after its four independent family packets; no behavior or new family scope was added.
4. [`06D — Root Compatibility Retirement`](04-root-compatibility-retirement/00-task-packet.md): complete after the
   correction proved root-consumer zero for the types-only surface and full exit gates passed.
