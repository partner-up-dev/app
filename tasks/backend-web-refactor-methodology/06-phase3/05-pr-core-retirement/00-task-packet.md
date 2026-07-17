# Slice 05 — `pr-core` Compatibility Retirement

## Objective & Hypothesis

Make `domains/pr` the only internal canonical PR surface and retire `domains/pr-core` plus legacy
`PartnerRequestService` through an explicit compatibility window. This is a compile-time/dependency migration,
not a product/API/schema rewrite.

## Entry / Exit

- Entry: PR Type Config boundary stable; importer inventory classified as runtime/type-only/test/external.
- Exit: internal runtime consumers use canonical PR, compatibility paths have zero consumers or explicit external
  owner/window, implementations are not duplicated, and removal has verified rollback.

## Status

Planned after Slice 04. No mutation started.
