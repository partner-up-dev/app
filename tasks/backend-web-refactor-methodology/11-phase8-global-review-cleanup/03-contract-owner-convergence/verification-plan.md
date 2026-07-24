# `8-2` Verification Plan

## Contract Proof

- compile-time symbol/equality fixtures for every exported type family;
- reference search proving no forbidden source enters `src/contracts.ts` or
  its transitive owner graph;
- Feedback/PR schema unit tests;
- Storage and Telemetry owner tests; and
- package export/type-resolution checks.

## Canonical

- Backend and Web type checks;
- Backend and Web unit suites;
- Feedback, PR edit/create and telemetry System/backend scenarios affected by
  the exported contracts;
- Web build; and
- architecture fitness to detect newly exposed cross-owner edges.

No migration, server probe or provider call is necessary for a type/value
ownership-only slice.
