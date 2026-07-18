# Slice 3-5 — `pr-core` Compatibility Retirement

## Objective & Hypothesis

Make `domains/pr` the only internal canonical PR surface and retire `domains/pr-core` plus legacy
`PartnerRequestService` through an explicit compatibility window. This is a compile-time/dependency migration,
not a product/API/schema rewrite.

## Entry / Exit

- Entry: PR Type Config boundary stable; importer inventory classified as runtime/type-only/test/external.
- Exit: internal runtime consumers use canonical PR, compatibility paths have zero consumers or explicit external
  owner/window, implementations are not duplicated, and removal has verified rollback.

## Status

Complete on 2026-07-17. Canonical commands, queries, contracts and ports now live under `domains/pr`; the
`PartnerRequestService` facade was removed and the `domains/pr-core` compatibility window was physically closed.
Focused unit/scenario, backend lint/type/build and architecture-fitness validation all passed. See
[`exit-evidence.md`](./exit-evidence.md) for exact results. This closes slice `3-5` only; later Phase 3 slices remain
independent.
