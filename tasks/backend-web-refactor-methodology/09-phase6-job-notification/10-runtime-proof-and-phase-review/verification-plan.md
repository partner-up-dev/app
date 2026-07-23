# `6-5` Verification Plan

## Local Canonical Gates

- `6-5.1a` source ledger proves the current wake-up/O11y/delivery topology and
  its external limits;
- focused injected request-tail/external-tick overlap tests;
- real-Postgres internal tick 503/401/200 plus bounded diagnostic route test;
- negative tests proving CaoCao and Job attempt paths emit no console/stdout
  diagnostics;
- focused Job/Notification/RideHailing unit and concurrency tests;
- migration fixtures on legacy and clean schemas;
- `pnpm check:static`;
- `pnpm test:unit:backend`;
- `pnpm test:unit:web`;
- `pnpm test:scenario:backend`;
- `pnpm test:scenario:system`;
- `pnpm test:scenario:all`, or its two constituent commands above run
  separately against the same checkout;
- no separate `pnpm check:build` after current `pnpm check:static`, which already
  composes the build gate.

## Current Local Completion Boundary

All Phase 6 local gates are complete. The former `6-5.1b-2` redaction result
was superseded by removal of those stdout paths. `pnpm test:scenario:backend`
and `pnpm test:scenario:system` were run separately; these are exactly the two
commands composed by `pnpm test:scenario:all`. Deployed O11y remains an
explicit Phase 7 concern rather than a Phase 6 gate.

## Required Scenario Matrix

| Area | Required proof |
| --- | --- |
| Job | due claim, lease recovery, retry exhaustion, missed timing, terminal HELD reservation, ACK/reopen concurrency |
| Notification one-shot | every template's timing, eligibility, logical limited/unlimited credit and four disposition branches |
| PR message | create, coalesce, terminal-held, hidden fetch, stale ACK, covering ACK, next generation |
| RideHailing fee confirm | atomic handoff, duplicate payment, success, generic retry/exhaustion, all-zero settlement, no owner ambiguity state |
| Runtime | authenticated tick, invalid token, explicitly enabled request-tail overlap, DB coordination, public health versus authenticated DB backlog/lag diagnostics |
| Migration | forward migration removes opportunity/wave/inbox state; current-source audits prove decoder/API retirement; delivery table retained |

## Deferred Observability Record

- record that no governed telemetry backend/query/retention/alert contract is
  present;
- remove rather than expand console/stdout diagnostics;
- retain DB Job state, protected aggregate diagnostics and
  `notification_deliveries`;
- place real O11y and delivery-table retirement in remaining work.

## Completion Rule

Phase 6 may close after local gates and structural review pass while explicitly
retaining `notification_deliveries` and deferring real O11y. It must not close
while the new Job console sink or legacy CaoCao stdout diagnostics remain.
