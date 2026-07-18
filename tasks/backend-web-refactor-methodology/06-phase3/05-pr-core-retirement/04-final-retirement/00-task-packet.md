# 05D — Compatibility Retirement

## Objective

Delete a compatibility alias, legacy barrel or facade only after the canonical owner is proven and all remaining
consumers have either migrated or a separately authorized external window is recorded.

## Status

Complete. The `domains/pr-core` directory, its compatibility barrel and `PartnerRequestService` facade were removed
after the runtime-zero and scoped source/test-zero guards passed. No database rollback or product/API change was
needed; a thin canonical delegate remains the documented restoration path if an external deployment consumer is
discovered.

## Entry Gate

- runtime-zero import report;
- type-only/test/package consumers classified;
- no duplicate implementation;
- affected scenarios and full Phase 3 verification planned;
- a small restoration patch exists without database rollback.

## Non-goal

This packet does not authorize opportunistic deletion. If an external or CF-01-related consumer remains, retain a
thin delegate and record it under `05C` instead.
