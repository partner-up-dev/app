# Biome Rule Pilot

## Evaluated Rules

Evaluated against `apps packages scripts tests`:

- `noSecrets`
- `useImportType`
- `noFocusedTests`
- `noImplicitAnyLet`

## Decision

Enabled two low-noise, high-value `suspicious` rules:

- `noFocusedTests`: prevents committing `.only` tests.
- `noImplicitAnyLet`: catches uninitialized `let` declarations that TypeScript `noImplicitAny` does not report.

## Rejected Or Deferred

- `noSecrets` is currently too noisy because Chinese business copy and test fixtures produce many high-entropy false positives.
- `useImportType` is useful, but reported 17 existing import-style changes. Treat it as a separate format-style cleanup slice before promotion.

## Fix Applied

`noImplicitAnyLet` found one real issue:

- `apps/backend/src/domains/ride-hailing/use-cases/handle-caocao-order-status-callback.ts`: `parsed` is now typed as `CaocaoOrderStatusCallback`.
