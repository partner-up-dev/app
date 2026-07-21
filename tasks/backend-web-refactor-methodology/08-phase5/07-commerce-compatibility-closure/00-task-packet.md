# 5-6A Core Public-Surface Closure

## Status

**Complete.** The original controller/script inventory was too narrow: a structural import audit also found retained
cross-owner domain edges behind the wildcard roots. The slice closed those edges in explicit batches and then
deleted the five root wildcard barrels after AST/import-resolution/textual zero-consumer proof. Admin *read
composition* remains explicitly deferred to a later `5-6B`-style Phase; no generic Commerce surface was introduced.

The authoritative volatile ledger is [`consumer-inventory.md`](./consumer-inventory.md). The newly discovered
cross-domain work is isolated in [`03-domain-owner-edge-closure/`](./03-domain-owner-edge-closure/), with a
rehearsal and low-cost proof plan before mutation.

## Objective

Retire only the active Commerce core wildcard/deep-import/legacy-adapter compatibility edges whose replacement
surface has a named owner, zero consumer inventory, focused proof, and cross-unit proof where user behavior crosses
Web/Backend. Controller consumers must move to explicit category entrypoints, never a replacement wildcard root.

## Bounded Plan

1. **Transport consumers — complete locally.** Move controller and registration-script imports to named commands
   or queries. This batch does not claim a root is removable.
2. **Test language and fixture integrity — complete.** Scenarios use named category surfaces or an owner-local test
   seam, and fixtures exercise the canonical Payment attempt claim rather than writing around it.
3. **Cross-domain owner edges — complete.** Every remaining domain-to-domain root import was classified as Command,
   canonical Query, stable Contract, or Port before moving it. Retained Rental source still counts: runtime
   retirement does not justify leaving a wildcard architectural dependency.
4. **Compatibility-root retirement — complete.** Structural inventory over production, tests, scripts, packages,
   and system scenarios found no consumer; all five legacy `index.ts` wildcard roots are deleted and package-level
   types remain explicit.

## Prohibited Shortcuts

No wildcard barrel replacement, no blanket deep-import allowlist, no test-only fake public API, and no deletion based
only on dead-code reporting. A helper with a fixture-sounding name is not automatically test-only: its actual
production caller and fact ownership must be classified before it is exposed as a Command or isolated in a test kit.
