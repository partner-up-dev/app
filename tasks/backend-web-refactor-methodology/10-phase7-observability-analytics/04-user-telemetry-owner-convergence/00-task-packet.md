# `7-3` — User-Telemetry Owner Convergence

## Status

**Locally complete on 2026-07-23.** `7-2` is locally complete and Sir
authorized execution through Phase 7 completion. Backend Registry/recorder and
Web collector/queue/transport changes are integrated and pass the focused
cross-workspace proof. The canonical repository gates recorded by `7-5` pass.

## Objective

Make the Backend Event Registry the single runtime owner of canonical
name/version/schema, and ensure non-authoritative telemetry cannot alter a
business response.

## Implemented Mutation

1. Expose a type-only canonical event contract from the Backend registry.
2. Move Web call sites from snake_case aliases to canonical dotted names.
3. Tighten loose schemas where current event evidence supports it.
4. Split Web event contract, journey/context, queue and transport
   responsibilities.
5. Remove or narrow the raw-event escape hatch.
6. Treat deterministic rejection as terminal, not retryable transport failure.
7. Make backend-confirmed recording non-throwing after business success.
8. Record telemetry-loss observability as a future requirement; do not
   reintroduce console/SLS output.

## Verification

- Registry exhaustiveness over Web types, canonical names, versions, backend
  emitters and fact references.
- Collector/queue/transport batching, retry and rejection tests.
- Accepted/rejected/idempotent ingest DB tests.
- A command scenario injects telemetry failure and proves one committed
  mutation with a successful response.
- Focused Backend/Web type and unit gates.

## Exit Gate

No duplicate event-name owner remains and no telemetry failure can replace a
successful business result.

## Result

- Backend Registry literals derive the public active name/version/owner/payload
  type; `@partner-up-dev/backend/contracts` exports types only.
- Web call sites use canonical dotted names and derive their input surface from
  frontend-owned active Registry contracts; the alias map and raw escape hatch
  are gone.
- Web collection, bounded queue and transport failure classification now have
  separate owners.
- Ingest accounts for accepted, rejected and idempotent inputs without losing
  duplicates from the batch total.
- Backend-confirmed recording resolves the active Registry version and returns
  a passive outcome; missing context, validation failure and storage failure
  cannot replace a committed business response.
- Exact verification is recorded in
  [`verification-log.md`](./verification-log.md).
