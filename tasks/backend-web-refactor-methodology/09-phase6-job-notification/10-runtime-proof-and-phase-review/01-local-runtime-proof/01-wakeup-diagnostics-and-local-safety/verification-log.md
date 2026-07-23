# `6-5.1b-1` Verification Log

## Source Result

- `createRequestTailMaintenanceRunner` makes interval, process-local
  single-flight, timeout and error-reset behavior injectable without changing
  request-tail skip policy.
- The protected external tick retains its existing 503/401/200 contract and
  process-local overlap skip. `GET /internal/maintenance/diagnostics` uses the
  same internal-token boundary.
- Diagnostics return only a bounded aggregate: status/backlog counts, due lag,
  lease/retry/missed/held facts and bounded runner registration/last-run state.
  They never return Job rows, payloads or `lastError` content.

## Local Verification

- Focused maintenance/controller unit run: `2` files / `5` tests passed,
  including injected request-tail interval/single-flight/error-reset and tick
  configuration/authentication/overlap behavior.
- Focused real-Postgres diagnostic scenario: `1` scenario passed, using delta
  assertions so unrelated shared scenario rows cannot create a false result.
- `pnpm test:unit:backend`: `110` files / `502` tests passed.
- `pnpm test:scenario:backend`: `45` files / `138` tests passed.
- `pnpm check:type:backend`, `pnpm check:lint:backend`,
  `pnpm check:build:backend`, and `git diff --check` passed.

## Remaining Gate

This is local source proof only. Actual FC cadence, deployed internal-token
access, SLS queryability/retention/alerts and operational runbook use remain
external `6-5.2` evidence. The diagnostic is read-only and does not authorize
Job replay, provider action or `notification_deliveries` retirement.
