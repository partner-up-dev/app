# `6-5` — Runtime Proof, Compatibility Retirement And Phase Review

## Status

**Locally complete on 2026-07-23.** The generic foundation has injectable
request-tail execution and protected tick/diagnostic route proof. The Phase 6
CaoCao stdout diagnostics and Job-attempt console sink are removed. `6-3.3`
legacy-state/decoder retirement and the simplified `6-4` recovery path passed
focused and full local gates. Deployed observability infrastructure and
`notification_deliveries` retirement move beyond Phase 6.

## Objective And Hypothesis

Prove that the refactored Job/Notification system works under its scale-to-zero
wake-up topology and that recovery does not confuse execution state with
business truth or ad-hoc console output with observability.

The slice contains three ordered sub-tasks. `6-5.1` itself is split so its
generic runtime seams do not wait behind provider semantics:

1. [`01-local-runtime-proof/`](./01-local-runtime-proof/)
2. [`02-deployed-o11y-proof/`](./02-deployed-o11y-proof/) (deferred beyond
   Phase 6)
3. [`03-compatibility-retirement-and-review/`](./03-compatibility-retirement-and-review/)

## Scope

- full static/unit/backend/system proof;
- authenticated FC tick and request-tail behavior;
- claim/lease/retry/reservation recovery drills;
- removal of Phase 6 console/stdout diagnostic additions and residue;
- deferral record for real observability and `notification_deliveries`;
- durable-doc current/compatibility reconciliation;
- Phase 6 architectural and regression review.

## Current Local Facts

- `createRequestTailMaintenanceRunner` isolates the existing process-local
  interval, single-flight and timeout behavior. `src/index.ts` composes it
  with the JobRunner without changing the request-tail skip policy; the
  scenario harness still deliberately disables live request-tail work.
- The external tick route now has focused 503/401/200 and single-flight proof.
  `GET /internal/maintenance/diagnostics` shares its internal-token boundary
  and returns a bounded aggregate of Job backlog/lag/lease/retry/held facts.
- `/health` remains intentionally cheap and process-local. The protected
  diagnostic is read-only, has no Job rows/payloads/last-error blobs, and is
  not a public-health expansion.
- The briefly introduced `job.attempt` console sink and its observer-failure
  `console.error` path were removed; no console adapter is the Phase 6
  observability answer.
- The CaoCao stdout diagnostics were removed rather than redacted. Current
  recovery uses durable owner/Job state and authorized provider evidence.

## Non-Goals

- no expansion into Phase 7 product analytics;
- no O11y signal as product/control authority;
- no provider mutation without separate safe operator authorization;
- no compatibility deletion on build-only or local-log confidence;
- no attempt to build the future observability platform inside Phase 6.

## Packet Files

- [`plan.md`](./plan.md)
- [`rehearsal.md`](./rehearsal.md)
- [`spec.md`](./spec.md)
- [`verification-plan.md`](./verification-plan.md)
- [`01-local-runtime-proof/`](./01-local-runtime-proof/)
  - [`00-source-ledger-and-local-contract-preflight/`](./01-local-runtime-proof/00-source-ledger-and-local-contract-preflight/)
  - [`01-wakeup-diagnostics-and-local-safety/`](./01-local-runtime-proof/01-wakeup-diagnostics-and-local-safety/)
  - [`02-provider-diagnostic-redaction/`](./01-local-runtime-proof/02-provider-diagnostic-redaction/)
  - [`03-post-fee-confirmation-recovery-matrix/`](./01-local-runtime-proof/03-post-fee-confirmation-recovery-matrix/)
- [`verification-log.md`](./verification-log.md)

## Exit States

- **Phase 6 fully closed:** local runtime/recovery/compatibility proof passes,
  console diagnostics are removed, `notification_deliveries` is explicitly
  retained/deferred, durable docs describe current truth, and the final review
  has no unresolved local defect.
