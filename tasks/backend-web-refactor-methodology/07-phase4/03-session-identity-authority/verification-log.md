# 4-2 Verification Log

All commands ran from the repository root on 2026-07-18. The committed-project `.npmrc` emitted the pre-existing
pnpm warning about an unexpanded GitHub registry credential on pnpm invocations; it did not change command status.

| Check | Actual result |
| --- | --- |
| changed-file `oxfmt` across 4-2 source/test paths | Passed |
| backend classifier unit | 1 file, 2 tests passed |
| focused public-session backend scenario | 1 file, 2 tests passed |
| coordinator/storage/RPC Web unit set | 3 files, 9 tests passed |
| focused Browser-to-Backend system scenario | 1 file, 1 test passed |
| backend + Web type checks | Passed |
| backend lint/structure | Passed |
| Web lint/token/naming | Passed; two pre-existing report-only Commerce naming findings |
| backend build + FC migration bundle | Passed |
| Web production build | Passed |

## Corrected Test-Isolation Finding

The first System invocation put its file filter after the package-script separator, so Vitest ran the wider system
project. Eight existing files and 42 tests passed; the new file failed before collection because root-owned test
code directly imported backend-only `drizzle-orm`. This was a test-boundary error, not a product assertion failure.
The scenario now invokes `apps/backend/tests/_infra/actions/user-state.ts`, so that dependency resolves at its
backend test-infrastructure boundary. The exact-file command then passed.

The final `git diff --check` and protected-path audit are recorded in the exit evidence.
