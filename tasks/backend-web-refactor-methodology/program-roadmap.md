# Backend / Web Refactor Program Roadmap

## Numbering Contract

This roadmap is the only owner of **Program Phase** numbers. The directories `01-backend/` through
`06-phase3/` are historical workstream ordinals, not Program Phases; in particular, `06-phase3/` means the sixth
task workspace created for this program and contains Program Phase 3.

Inside Phase 3, `3A`–`3C` are stage groups and `3-1`–`3-8` are executable slices. This keeps “phase”, “stage” and
“slice” from competing for the same number.

## Confirmed Sequence

```text
Phase 1: behavior and authority freeze                         Complete (historical)
Phase 2: read-only baseline and toolchain recovery             Complete (historical)

Phase 3: architecture and PR migration protocol               Complete
  Phase 3A: foundation and calibration
    3-1 baseline and fitness                                  Complete
    3-2 PR Discovery read owner                               Complete
  Phase 3B: mutation calibration and PR owner convergence
    3-3 Feedback mutation vertical                            Complete
    3-4 PR Type Config boundary                               Complete
    3-5 pr-core retirement                                    Complete
    3-6 contract surface narrowing                            Complete
  Phase 3C: conflict closure
    3-7 CF-01 authenticated-only PR persistence               Complete
    3-8 CF-02 waitlist header-only auth contract              Complete
  -> Phase 3 exit                                             Complete

Phase 4: User/Auth                                                 4-0–4-3 local semantics complete; 4-1 rollout observation and 4-3 topology evidence pending
Phase 5: Commerce
Phase 6: Job/Notification runtime
Phase 7: Observability/Analytics
Phase 8: global review and cleanup
```

Phase 3A established the measurable/read-owner foundation through `3-1`/`3-2`. Phase 3B then carried the
browser-to-Postgres mutation calibration in `3-3` through PR owner convergence in `3-4`–`3-6`; Phase 3C closed
CF-01/CF-02 in `3-7`/`3-8`. The complete Phase 3 evidence is owned by
[`06-phase3/exit-evidence.md`](./06-phase3/exit-evidence.md).

Phase numbers after Phase 3 express order, not a frozen sub-slice design. Phase 4 completed its entry
characterization in [`07-phase4/01-auth-transport-inventory/`](./07-phase4/01-auth-transport-inventory/), then
executed the explicitly authorized, narrow `4-1` origin/return-target containment slice under
[`07-phase4/02-oauth-security-containment/`](./07-phase4/02-oauth-security-containment/). Its local proof and
durable authority promotion are complete; its state-free public header observation is pending normal rollout.
`4-2` then completed public session/identity authority with focused and Browser-to-Backend proof, promoting its
compact rule to the shared session contract. Its scoped packet is
[`07-phase4/03-session-identity-authority/`](./07-phase4/03-session-identity-authority/). 4-3 under
[`07-phase4/04-oauth-handoff-callback-compatibility/`](./07-phase4/04-oauth-handoff-callback-compatibility/) then
completed its local terminal-handoff/direct-callback compatibility repair and promoted the recovery rule to the
OAuth Unit TDD. Provider-console and edge-topology conclusions remain external evidence gaps; 4-4 and 4-5 still
require refreshed entry evidence, authority graph, contract conflicts and a low-cost verification plan. This status
does not authorize them.

## Program Phase Boundaries

| Phase | Intended owner problem | Required entry evidence | Exit shape |
| --- | --- | --- | --- |
| 1 | Freeze observable behavior and authority claims | Repository and durable truth at historical entry | Product invariants, authority paths and conflicts recorded |
| 2 | Establish a read-only structural/runtime baseline and recover trustworthy gates | Phase 1 freeze | Reproducible baseline; Web build and System scenario restored |
| 3 | Prove the target architecture on PR/read/mutation/contracts and close CF-01/CF-02 | `3-1` fitness baseline | `3-1`–`3-8` green; conflicts resolved in durable truth and System journeys |
| 4 User/Auth | Session, OAuth, pending actions, auth transport and user ownership | Phase 3 auth seams stable; current auth SCC/continuity inventory | One explicit session/workflow owner per journey; no duplicate auth truth |
| 5 Commerce | Order/payment/bill/fulfillment/provider authority and compensation | User/Auth contract stable; provider/idempotency matrix | Deep Commerce owners with proven callback, settlement and recovery paths |
| 6 Job/Notification | JobRunner, scheduling, delivery and retry/bootstrap ownership | Commerce side effects stable; runtime topology and retry evidence | Explicit runtime owner, idempotency/retry policy and lifecycle proof |
| 7 Observability | Telemetry, analytics, operational signals and authority boundaries | Prior domain events/surfaces stable | Signals follow domain semantics without becoming product truth |
| 8 Global review | Cross-phase consistency, expired compatibility and report-first findings | Phases 3–7 exited | Global fitness review, targeted cleanup, durable-doc/link/gate reconciliation |

## Program Guardrails

- Later-phase scope must not leak into an earlier phase merely because a dependency is nearby.
- Every executable slice uses poly-file/per-sub-folder task packets, explicit entry delta, rehearsal, evidence index
  and verification log.
- Compatibility is removed only after its replacement has both focused and cross-unit proof.
- Global cleanup is evidence-driven: no broad formatting, directory churn or dead-code deletion disguised as
  architecture progress.
