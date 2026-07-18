# 06C — Consumer-family Migration

## Objective

Move Backend-owned stable value types to the types-only subpath and Web request/response aliases to their inferred
domain contract modules in bounded consumer families. Preserve runtime behavior and keep each family independently
reviewable and reversible.

## Owned Surface

- One explicitly recorded Web consumer family per batch: Feedback/PR Discovery first, PR lifecycle second, then
  Share, Commerce and Admin only when each family has stable contracts and target tests.
- Type-only import sites and the corresponding domain adapter/contract compatibility aliases needed by that family.
- A task-local before/after consumer list and exceptions for the active family.

Backend root-export deletion, unrelated query refactors, runtime API changes and repository-wide mechanical churn do
not belong to 06C.

## Entry Information

- 06A must prove the types-only package surface; 06B must prove the inferred-alias pattern on a pilot.
- Before each family, capture exact root-package symbols, query/`lib/rpc` type edges, handwritten duplicates,
  affected unit tests and the cheapest relevant System journey.
- Classify every import as type-only or runtime. Static graph output that does not preserve this distinction is
  supporting evidence only.
- Freeze one family's owned files, baseline consumer count and intended terminal import path before mutation; do not
  start the next family while the current one has unexplained residuals.

## Fork / Stop Conditions

- If Admin or Commerce depends on a broad composite that is not a stable contract, retain the existing compatibility
  import and record the missing owner instead of widening the new subpath.
- If a purported type-only migration changes emitted code, request behavior or package runtime reachability, stop and
  isolate the runtime change.
- If a response changes while aliases move, return to Backend/Web contract ownership and add behavior proof; do not
  repair with assertions or copied interfaces.
- If a batch reaches CF-01/CF-02 create, publish, waitlist or OAuth semantics, stop and leave it to `3-7`/`3-8`.

## Low-cost Verification

- Compare focused `rg` consumer counts and type-only/runtime import classification before and after each family.
- Run the family's Web unit tests plus `pnpm check:type:web`; run `pnpm check:build:web` after each coherent family.
- Run Backend type/build only when the family changes Backend exports. Run targeted System only when runtime source or
  a user-visible cross-unit contract changes; otherwise reserve full System for 06D exit.
- Confirm Web model/UI no longer imports contract types from query modules or `lib/rpc`, except an explicitly recorded
  temporary compatibility facade.

## Rebased baseline (2026-07-17)

The current Web/system scan finds 74 root type-import declarations and five inline
`import("@partner-up-dev/backend").T` type edges. The classification is:

- `AppType`: 2 declarations, only in `apps/web/src/lib/rpc.ts` and
  `apps/web/src/lib/admin-rpc.ts`; this remains the transport-owned root seam and is not a family target.
- Contract-safe symbols: 37 declarations plus five inline edges, all available from
  `@partner-up-dev/backend/contracts` (`FeedbackQuestionnaire*`, join-gate types, PR route/status/value types,
  `PartnerRequestFields`, and `ImageUploadPurpose`).
- Compatibility exceptions: `PRId` has 34 declarations and remains at the package root; `OrderingOfferDetail` has
  one declaration and remains at the package root. Neither exception may be recast as a new contract surface.
- Deep Backend implementation imports exist only in the System scenario harness/tests (for app boot, database,
  repositories, domain fixtures, and probes); they are not Web consumer migrations. The complete list is recorded in
  [`deep-backend-test-imports.md`](deep-backend-test-imports.md) and remains out of 06C ownership.

## Family index

Each family is an independently executable packet with an entry inventory and rehearsal:

1. [`01-pr-discovery-value-migration/`](01-pr-discovery-value-migration/00-task-packet.md): route, authoring,
   discovery and creation value consumers; `PRId` in mixed creation files stays root.
2. [`02-pr-lifecycle-value-migration/`](02-pr-lifecycle-value-migration/00-task-packet.md): status, join-gate,
   feedback-in-PR and identity consumers; all `PRId` edges are compatibility-only.
3. [`03-feedback-admin-value-migration/`](03-feedback-admin-value-migration/00-task-packet.md): Admin feedback
   and Admin PR management consumers.
4. [`04-share-commerce-upload-value-migration/`](04-share-commerce-upload-value-migration/00-task-packet.md):
   Share and upload consumers plus the Commerce `OrderingOfferDetail` exception.

The family order is a dependency order, not permission to batch families together. Freeze one inventory and its
baseline count before editing; unexplained residuals stop that family and do not roll into the next one.

## Status

Complete on 2026-07-17 after one bounded census correction. The four original families retain their focused evidence;
the 06D entry census found one omitted 06C.1-authoring edge in `DateTimeRangePicker.vue`, and
[`05-exit-census-correction/`](05-exit-census-correction/00-task-packet.md) moved it to the contracts surface with
its own proof. The repeat repository-wide census now leaves only the declared `AppType`, `PRId`, and
`OrderingOfferDetail` root exceptions. This was not a fifth family or a behavior change. 06D may proceed.
