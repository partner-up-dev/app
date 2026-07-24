# `8-1` — Active Boundary Regressions And Fitness Integrity

## Status

**Complete on 2026-07-23.** Sir authorized continuous execution through
`8-5`. This folder owns one executable slice, not a new phase or stage.

## Objective

Remove the four post-baseline Backend private cross-domain imports and the one
fake unresolved production import while preserving the ratified meeting-point
and Commerce atomicity semantics.

## Frozen Invariants

- PR-type and POI meeting-point mutations commit their source mutation and
  Notification handoff in the same named transaction.
- Trade settlement and RideHailing fee-confirmation Job reservation keep their
  current atomic boundary and lock order.
- No generic transaction helper, repository exposure or adapter export is
  introduced.
- HTTP behavior, schemas and product policy do not change.
- The controller guidance continues to point to a real, shallow HTTP exemplar.

## Execution Order

1. Rebase the exact four-edge and SCC inventory on the execution `HEAD`.
2. Move the PR-type coordination transaction into the `pr-type-config` owner,
   consume all PR meeting-point operations through the existing semantic PR
   Port, and make Admin call the owner's explicit command. The persistence
   projection remains owner-internal.
3. Expose the RideHailing settlement operation through its ratified semantic
   Port rather than its private adapter path.
4. Replace the fake `canonical.controller.ts` instruction target with a real
   mounted exemplar or a non-production verified fixture.
5. Tighten fitness/fixture coverage so the same private and unresolved shapes
   cannot silently return.

## Preflight Simulation

- PR-type keeps serializable retry, config lock, affected-PR locks, old
  effective-point capture, config mutation, recipient lookup and Notification
  reservation in the existing order and transaction.
- POI keeps POI lock, old/new affected-PR union lock, mutation, recipient
  lookup and Notification reservation in one transaction; only the import seam
  changes.
- Trade asks a narrow dynamically loaded RideHailing Port to perform the
  existing settlement/reconciliation transaction. The Port does not open a
  second transaction and Trade still applies the returned Bill settlement
  afterwards.
- The unresolved-import regression lives in the architecture fixture, not in
  production source. The fixture is asserted independently because unresolved
  edges are not architecture findings.

## Verification Batches

1. PR-type Admin delegation unit plus PR-type and POI notification scenarios.
2. RideHailing callback scenario and Backend type-check.
3. Architecture fixture tests, deterministic current report, unresolved count,
   finding classification and eager/full SCC comparison.

## Exit

- four new private findings are gone;
- unresolved production imports are zero;
- no additional public surface beyond the named semantic operations;
- focused transaction/route proof and canonical static gates pass; and
- the full/eager SCC distinction is remeasured rather than guessed.

## Exit Result

- The four post-baseline private edges were removed without adding a generic
  transaction abstraction or persistence-shaped public API.
- The production unresolved import count is zero; unresolved-path behavior is
  covered by a non-production fitness fixture.
- Current report: `943 files / 3563 edges / 17 known findings / 0 new /
  0 unresolved`.
- Backend eager/full Commerce SCC membership is unchanged and remains owned by
  `8-5`.
- Detailed command evidence is in [verification-log.md](./verification-log.md).

## Non-goals

Controller/repository migration, broad barrel cleanup, Commerce cycle
decomposition, provider calls and database/schema changes belong elsewhere.
