# Slice 3-5 Execution Plan

## Required Information Before Editing

1. Symbol-level importer map for `domains/pr-core`, `pr/services` re-exports and `PartnerRequestService`.
2. Runtime versus type-only versus test/mock versus external/script consumers.
3. Canonical symbol owner and characterization test for every old export.
4. Current SCC/import graph, package root exports and build/type consumers.

## Subtasks

### 05A — Curate Canonical PR Surface

- Export commands, queries, contracts and real ports from `domains/pr` without exposing every internal service.
- Map each old symbol to canonical owner or an explicit boundary adapter.
- Add deprecation/compatibility metadata rather than duplicating implementation.

### 05B — Migrate Consumers Incrementally

- First internal controllers/domains; then LLM/WeCom/share legacy integration adapters; then tests/scripts.
- Run target type/unit/scenario after each consumer family.
- Forbid canonical PR from importing compatibility PR; allow compatibility→canonical only.

### 05C — Thin And Observe Legacy Facades

- Keep `PartnerRequestService` as a signature-preserving delegate while real consumers remain.
- Preserve external payload mapping in integration adapters, not in PR domain rules.
- Record consumers and removal condition; do not delete merely because static grep reaches zero if dynamic scripts exist.

### 05D — Remove After The Window

- Require zero internal runtime imports, dead-code/report evidence, full verification and owner approval.
- Delete alias/facade in a small final diff with an immediate restoration path.

## Verification

- Focused `rg`/import parser inventory after every batch.
- Backend type/build/unit/scenario plus affected share/LLM/WeCom tests.
- Targeted/full System for user-visible PR paths.
- No duplicate implementation, no new SCC and no HTTP/schema diff.
