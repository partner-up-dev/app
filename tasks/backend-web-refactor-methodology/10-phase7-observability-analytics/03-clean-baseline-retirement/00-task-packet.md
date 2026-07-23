# `7-2` — Clean-Baseline Retirement

## Status

**Complete on 2026-07-23.** Sir explicitly authorized execution through Phase
7 completion. Repository source, deployment plumbing, migration and durable
truth are closed. Sir confirms that SLS has no configured saved queries or
dashboards and closes further platform-artifact inventory for this Phase, so
D7-04 no longer blocks completion. The canonical repository gates recorded by
`7-5` pass.

## Objective

Delete the rejected repository SLS coupling and selected production
pseudo-observability while preserving business, Job, provider and user-visible
behavior. Do not implement a replacement.

## Implemented Mutation

1. Remove FC SLS variables and `logConfig`.
2. Remove deploy-workflow and environment-validator SLS requirements.
3. Remove selected structured/request/debug output and their supporting
   headers, CORS entries, storage, types and tests.
4. Forward-retire `operation_logs`, production writers and stale guidance.
5. Update durable deployment/runtime/topology truth.
6. Close external saved SLS state from explicit operator evidence/decision,
   without inventing an environment audit or deletion.

## Verification

- Zero-reference searches for every deleted surface.
- FC configuration/environment validation and packaging/build proof.
- Callback-router tests verify routing/response behavior without log events.
- Focused Commerce/OAuth/WeCom/Job-trigger tests for touched paths.
- Backend/Web unit and relevant scenario gates.
- External deletion evidence or an exact blocker.

## Exit Gate

The repository is deployable, rejected mechanisms are absent, behavior is
unchanged and documentation says professional program observability is not
implemented.

## Result

- FC `logConfig`, SLS variables and their CI/validator/documentation contract
  are gone.
- Hono request logging, CaoCao structured output, OAuth/WeCom diagnostics,
  Commerce order-detail debug protocol, RideHailing listing structured output,
  and selected runtime stdout are gone.
- `operation_logs`, its writers and local guidance are forward-retired by
  migration `0095_retire_operation_logs.sql`.
- CLI/development/test UX and browser fallback diagnostics remain inside the
  ratified boundary.
- Source zero-reference checks, deploy dry-run, database migration checks,
  focused behavior tests and Backend/Web type checks pass. See
  [`verification-log.md`](./verification-log.md).
