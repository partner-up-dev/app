# 5-6A Consumer Inventory

## Snapshot And Scope

This began as an exact `rg` snapshot after the 5-2/5-5 public replacements were added. A subsequent TypeScript AST
import audit found additional relative domain-root imports that the initial path-oriented inventory missed. This
ledger distinguished transport consumers, tests, retained cross-domain source, and package compatibility exports.
The table below is the historical pre-retirement baseline; the final zero-consumer result is recorded after it.

Search scope: `apps/backend/src`, `apps/backend/tests`, and `tests/scenario`, TypeScript source only. The structural
query matches named imports and filters an import source whose terminal segment is one of the five owner roots.
The audit deliberately excludes persistence entity imports such as `entities/bill`.

| Owner root | Transport consumers | Cross-domain source consumers | Test / system consumers | Replacement work before root removal |
| --- | --- | --- | --- |
| Bill | Commerce controller (moved to `queries`) | Ride final-settlement creation; Trade payment-state/termination reads | Rental history and Payment fixtures | classify Bill materialisation as a real command, state reads as canonical queries, then migrate retained Rental code too |
| Payment | provider registration script (moved to `commands`) | retained Rental refund execution | callback fixture; system Ride registration | commands for registration/settlement/refund execution; fixture must claim the real BillLine attempt |
| Trade | Commerce controller (moved to commands/queries) | Bill item-name projection | Rental history, admin Ride, Ride foundation | commands/queries plus an owner-local test seam only where a helper is not a production command |
| RideHailing | Commerce and provider callback controllers; registration script (moved to `commands`) | Trade create/list/cancel flows invoke provider port/sync/errors | callback and system Ride | explicit Port/Contract/Command classification; no implicit use-case re-export |
| Merchandising | admin-commerce and placement controllers (cutover in progress) | Trade listing/create facts; admin validation/binding commands | Commerce/Ride/system builders | commands, queries, and pure contracts; do not route entity types through an application-layer barrel |

## Historical Cutover Batches

1. **Transport cutover — complete locally.** Controllers and provider-registration scripts now use named
   categories; affected type/lint/scenario proof is recorded in the implementation log.
2. **Test language/fixture integrity — complete.** All consumers use named categories or an owner-local test seam;
   the cancelled-terminal callback fixture opens and settles the real payment attempt.
3. **Cross-domain owner-edge cutover — complete.** The `03` subpacket's fact table/rehearsal classified and removed
   the retained root edges.
4. **Root deletion — complete.** A zero-consumer AST/import-resolution/textual inventory covered every root;
   package-level type exports remain explicit and no root was deleted as collateral.

## Exclusions

- Entities/repositories importing an owner model type are persistence-bound and are not cross-domain public-surface
  violations in this closure.
- Admin read-composition remains `5-6B` work; admin mutation-side validation remains in this closure.
- Rental R0 preserves historical source/data readability, so its retained code and history scenarios are not
  exempt from owner-surface cutover.

## Low-Cost Proof Plan

- Per batch: AST root-consumer inventory before/after, backend typecheck, scoped lint, and the directly affected
  backend/system scenario.
- Before root deletion: zero-consumer AST search plus a textual backstop, backend type/build, and one active
  Commerce journey. No deletion is justified by an unused-export report alone.

## Final Root-Retirement Evidence

All five files are deleted:

```text
domains/bill/index.ts
domains/trade/index.ts
domains/payment/index.ts
domains/ride-hailing/index.ts
domains/merchandising/index.ts
```

The final scan covered source, tests, system scenarios, scripts, packages, aliases, relative imports, re-exports,
and dynamic/CommonJS textual paths. It found zero terminal root consumers. `apps/backend/package.json` exports only
the package root and types-only `./contracts`, so no package subpath preserved these private roots. Backend type/lint/
build, complete backend scenarios, and complete system scenarios passed after deletion.
