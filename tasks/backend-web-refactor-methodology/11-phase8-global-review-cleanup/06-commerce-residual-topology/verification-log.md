# `8-5` Verification Log

Date: 2026-07-23

## Result

Complete. Bill pure rules now depend on persistence-independent Bill values,
the Trade/Bill and nested RideHailing cycles are both closed, and
`dispatchBinding` has one source/storage/durable authority statement. No
query optimization, provider replay model or Rental product work entered the
slice.

## Topology And Authority Proof

- Backend dependency graph:
  - static: `533 files / 2,296 edges / 0 cyclic components`;
  - static plus dynamic imports:
    `533 files / 2,303 edges / 0 cyclic components`.
- Web dependency graph remains acyclic:
  - static: `438 files / 1,219 edges / 0 cyclic components`;
  - static plus dynamic imports:
    `438 files / 1,259 edges / 0 cyclic components`.
- Architecture fitness reports
  `971 files / 3,680 edges / 0 unresolved / 3 known / 0 new`; the three known
  Web endpoint/primitive findings are assigned to proposed `8-6`.
- Architecture-fitness guard suite: `8/8`.
- [`dispatch-binding-authority-audit.md`](./dispatch-binding-authority-audit.md)
  traces both writers and the provider execution, reconciliation,
  cancellation and projection readers. They agree with the durable truth
  already promoted by `171319de`, so no source, schema or durable-doc mutation
  was warranted for that field.

## Focused And Scenario Proof

- Focused Bill/Trade/RideHailing tests: `5 files / 12 tests`.
- Targeted Backend Commerce scenarios: `4 files / 14 tests`.
- Targeted System Commerce journeys: `3 files / 11 tests`.
- Complete Backend unit project: `122 files / 549 tests`.
- Complete Web unit project: `76 files / 248 tests`.
- Complete Backend scenario project: `47 files / 140 tests`.
- Complete System scenario project: `11 files / 39 tests`.

The full System runner exited zero after its owned server/database cleanup.

## Canonical Integration Gate

`pnpm check:static` passed after:

1. formatting the Phase 8 implementation batch; and
2. updating `scripts/check-pr-time-contract.mjs` to verify the canonical PR
   contract leaf introduced by `8-2`, plus the entity compatibility re-export,
   instead of assuming the schema implementation still lived in the entity.

The successful gate includes format, Oxlint, Backend structure and policy
guards, Backend/Web and fake-provider type checks, database/config checks,
report-first dead-code/security scans, and Backend/Web production builds. The
Web build transformed `927` modules. Knip remains report-first; its
compatibility residue is input to `8-6`, not deletion authority or an `8-5`
failure.

## Review Result

The final read-only review found no P0/P1 behavior, topology or ownership
blocker. Plain string identifiers in Bill value facts match the existing Bill
model/contract convention, and settlement/fee-confirmation/replay scenarios
cover the retained dynamic provider composition even though the tiny wrapper
has no dedicated unit test.
