# 06C.4 — Share/Commerce/Upload value migration

## Objective

Migrate the stable upload purpose type in the cross-domain Share/Upload family while explicitly preserving the two
root compatibility exceptions used by Share and Commerce: `PRId` and `OrderingOfferDetail`.

## Exact ownership

The exact paths are in [`entry-inventory.md`](entry-inventory.md). `ImageUploadPurpose` may move to
`@partner-up-dev/backend/contracts`; all Share `PRId` imports and Commerce `OrderingOfferDetail` remain at the root.
No Commerce response shape, offer model or shared API wrapper is introduced.

## Rehearsal and stop gates

Follow [`rehearsal.md`](rehearsal.md). Stop if upload code emits a runtime dependency, if Share asks for a new ID
alias, or if `OrderingOfferDetail` is not a stable contracts export. Keep the exceptions recorded rather than
forcing a migration.

## Cheapest verification

Run focused `rg` counts (two safe upload edges unchanged exception counts), upload/share unit tests,
`pnpm check:type:web`, `pnpm check:build:web`, and `git diff --check`.

## Status

Complete on 2026-07-17. Both shared upload `ImageUploadPurpose` type-only imports now resolve through
`@partner-up-dev/backend/contracts`; all six Share `PRId` and the Commerce `OrderingOfferDetail` compatibility
imports remain root-retained. See [`exit-evidence.md`](exit-evidence.md).
