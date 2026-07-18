# Slice 3-5 Exit Evidence — `pr-core` Compatibility Retirement

## Outcome

Phase 3 slice `3-5` is complete as of 2026-07-17. `domains/pr` is the sole canonical PR implementation and public
surface. The former `domains/pr-core` implementation, broad service barrel and private `PartnerRequestService` facade
were removed after consumer cutover; no product, HTTP, schema, migration or provider choreography changed. This
evidence closes slice `3-5` only; it does not claim full Phase 3 exit.

## Retirement Guards

The final promotion guard was run immediately before durable-document edits:

```text
test ! -e apps/backend/src/domains/pr-core                         PASS
test ! -e apps/backend/src/services/PartnerRequestService.ts       PASS
rg --glob '*.ts' 'pr-core|PartnerRequestService' \
  apps/backend/src apps/backend/tests tests                         0 matches
```

The scoped inventory covers backend production source, backend tests and root scenario tests. Package-root exports
remain limited to `.`; no service subpath export or dynamic consumer was found in the 05C evidence.

## Promotion Verification

All required slice-level checks passed:

- Focused Backend unit: 8 files / 30 tests PASS.
- Selected Backend scenario: 6 files / 26 tests PASS.
- `pnpm check:lint:backend` PASS.
- `pnpm check:type:backend` PASS.
- `pnpm check:build:backend` PASS.
- Architecture fitness against
  `tasks/backend-web-refactor-methodology/06-phase3/01-baseline-and-fitness/architecture-fitness-baseline.json`
  with `--check-new`: 42 known / 0 new / 83 stale-known PASS.
- Retirement guard above and `git diff --check` PASS.

These checks promote slice `3-5` only. Phase 3 remains open for the independent later slices and their own exit
evidence.

## Restoration / Forward Fix

If a previously unobserved deployment script requires the old facade, restore one file as a thin delegate to named
`domains/pr` entrypoints only. Do not recreate `pr-core` implementation files, widen the public barrel, or roll back
database state.
