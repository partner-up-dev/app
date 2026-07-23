# `6-1` Verification Log

> Completion update on 2026-07-23: the temporary console observer was removed,
> affected and full suites were re-run, and real attempt telemetry was
> deferred to Phase 7. Earlier slice-local results below remain historical
> evidence rather than the Phase 6 exit matrix.

## Local Results — 2026-07-22

| Check | Result | Evidence |
| --- | --- | --- |
| focused JobRunner unit tests | pass | typed success/skip/retry/exhaustion, malformed result, version selection, legacy return/throw and stale completion |
| isolated Postgres Job scenario | pass | cancel history, legacy defaults, terminal-safe cause, concurrent HELD coalesce/high-water, stale/covering ACK, reopen, CAS and transaction rollback |
| backend type / lint | pass | `pnpm check:type:backend`; `pnpm check:lint:backend` |
| migration/schema checks | pass | `pnpm check:config:backend` (`db:lint`, Drizzle check) |
| backend build / FC migration bundle | pass | `pnpm check:build:backend` |
| full backend scenario suite | pass | 26 files / 82 tests |
| full backend unit suite | pass with valid non-connecting URL | 90 files / 405 tests under `DATABASE_URL=postgres://localhost:5432/partnerup` |

Running `pnpm test:unit:backend` with no `DATABASE_URL` produced one unrelated
import-time failure in `src/domains/pr-authoring/submit-preference-tags.test.ts`;
the unit Vitest project does not load environment files. The exact test and the
complete suite pass when supplied the valid URL above, and no connection was
attempted by that mocked test.

`pnpm format:check` remains a repository-wide baseline failure in pre-existing
unrelated files. The changed `6-1` files were formatted with `oxfmt` and are
checked directly in the final local gate.

## Acceptance Evidence

- Job → business static dependency: Job core imports only entity/repository/lib
  infrastructure; backend structure lint passes.
- Structured outcomes: pure unit matrix proves `SUCCEEDED`, `SKIPPED`, retry,
  exhausted retry, permanent failure, unknown handler/version/payload and bad
  runtime result do not silently become success.
- Fence: scenario uses the real persistence transition CAS; old
  runner/token updates zero rows while the current token alone completes.
- Reservation: concurrent writers produce one HELD generation and maximum
  high-water; terminal execution remains HELD until covering ACK releases it,
  after which the same logical key opens a new generation.
- Atomic writer: a caller-owned transaction that throws after reservation
  scheduling leaves no Job row.
- O11y boundary: the Job/CaoCao console sinks are absent; focused tests, backend
  typecheck and backend lint pass. No `job_attempts` schema/table was
  introduced.

## Forward Cut-Off

The static compatibility map remains historical evidence. Sir explicitly
waived production active-row and old-runner drain proof for Phase 6; current
source and forward migrations are the completion boundary.
