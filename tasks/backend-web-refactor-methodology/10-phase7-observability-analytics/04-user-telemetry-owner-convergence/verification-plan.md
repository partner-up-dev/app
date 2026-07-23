# `7-3` Verification Plan

Verification is staged to keep delegation value positive: workers run
owner-focused checks; the root runs the cross-workspace type contract and one
integrated Phase gate later.

## Backend Worker Gate

1. Registry unit tests:
   - unique active name;
   - literal name/version projection;
   - strict accepted/rejected payloads for the four Backend PR events.
2. Real-Postgres telemetry scenario:
   - first insert is accepted;
   - the same `event_id` is idempotent;
   - unknown/invalid input is rejected and ledgered;
   - every batch count sums to its input size.
3. Real HTTP/DB failure isolation:
   - a temporary failing insert trigger affects only telemetry;
   - structured PR creation still returns success;
   - exactly one PR mutation commits.
4. `pnpm check:type:backend`.

## Web Worker Gate

1. Collector tests for context ordering, canonical envelopes, SPM rules and
   forbidden-field stripping.
2. Queue tests for FIFO, cap, batch and bounded failed-front requeue.
3. Transport tests for terminal/retry classes, timer lifecycle and
   single-flight behavior.
4. Facade/debug characterization and journey reuse/expiry coverage.
5. `pnpm check:type:web`.
6. Zero references to snake-case `trackEvent` names, the alias map, the
   canonical-name resolver and the public raw-event API.

## Root Integration Gate

- `pnpm check:type` proves the workspace type-only projection.
- Focused Backend/Web telemetry suites are rerun after integration review.
- Full unit/scenario/static/build gates are amortized into `7-5`.
- A structural search proves no second runtime event-name/version catalog was
  introduced.
