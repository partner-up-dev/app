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

Phase 4: User/Auth                                                 local implementation complete; external rollout/topology evidence pending
Phase 5: Commerce                                                  local source convergence committed (`171319de`); 5-7a evidence and explicit deferrals remain
Phase 6: Job/Notification runtime                                 Complete locally; real O11y/delivery retirement handed to Phase 7
Phase 7: Observability/Analytics                                  not started
Phase 8: global review and cleanup                                not started
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
OAuth Unit TDD. Provider-console and edge-topology conclusions remain external evidence gaps. 4-4 then completed
its Web-only transport/process boundary, named PR continuation protocol, focused proof, and durable promotion under
[`07-phase4/05-authenticated-escalation-pending-commands/`](./07-phase4/05-authenticated-escalation-pending-commands/).
Its attempted browser continuation proof stopped faithfully at a System-harness canonical-host cookie mismatch;
the packet records the stronger lower proof and re-entry condition without claiming a passing end-to-end journey.
4-5 then introduced Sir's explicit `/bills` route-entry OAuth promise through one reusable router guard, retired two
local-private unused WeChat facades with closed local evidence, and promoted the intended product/process rules under
[`07-phase4/06-route-entry-auth-and-facade-closure/`](./07-phase4/06-route-entry-auth-and-facade-closure/).
The subsequent completion review under [`07-phase4/07-completion-review/`](./07-phase4/07-completion-review/) repaired
the stale async-navigation OAuth side effect and whitespace-provider-`openid` acceptance, with focused/full proof and
durable rule promotion. Phase 4 is locally closed; it still leaves the 4-1 rollout and 4-3.4 provider/topology
evidence branches open rather than calling local completion a production-topology conclusion.

Phase 5 completed its local owner convergence in `171319de`: Quote-to-order
admission now has a durable attempt boundary, Checkout uses one PaymentTx cache
authority, RideHailing observation is explicit rather than a Detail-read side
effect, and core compatibility roots are retired. `5-7b` local review is
complete. `5-7a` remains an external staging/provider proof branch. The
retained Rental Bill payment path is a Sir-accepted risk, while post-settlement
RideHailing fee-confirmation recovery is deliberately handed to Phase 6's
atomic-settlement + typed-Job handoff; official docs permit an `order_id`-only
call and Sir accepts lost-response duplicate-effect risk. No generic outbox,
owner ambiguity state, or operator recovery model is implied.

Phase 6 completed its local Job/Notification convergence on 2026-07-23.
Business notification producers now use one versioned generic Job owner;
semantic PR-message acknowledgement replaces inbox/read-marker persistence;
opportunity/wave/inbox state, concrete per-kind decoders and no-cycle payload
compatibility are forward-retired. RideHailing qualifying settlement
atomically creates one typed fee-confirmation Job, while provider I/O occurs
after commit through an `order_id`-only internal handler. The scale-to-zero
tick/request-tail seams, protected aggregate diagnostics and full local gates
are proven. `notification_deliveries` remains inert audit history until Phase
7 supplies governed observability.

## Program Phase Boundaries

| Phase | Intended owner problem | Required entry evidence | Exit shape |
| --- | --- | --- | --- |
| 1 | Freeze observable behavior and authority claims | Repository and durable truth at historical entry | Product invariants, authority paths and conflicts recorded |
| 2 | Establish a read-only structural/runtime baseline and recover trustworthy gates | Phase 1 freeze | Reproducible baseline; Web build and System scenario restored |
| 3 | Prove the target architecture on PR/read/mutation/contracts and close CF-01/CF-02 | `3-1` fitness baseline | `3-1`–`3-8` green; conflicts resolved in durable truth and System journeys |
| 4 User/Auth | Session, OAuth, pending actions, auth transport and user ownership | Phase 3 auth seams stable; current auth SCC/continuity inventory | Local session/workflow owner closure; external rollout/provider-topology claims remain separately evidenced |
| 5 Commerce | Order/payment/bill/fulfillment/provider authority and compensation | User/Auth contract stable; provider/idempotency matrix | Local Commerce owner closure with explicit external-evidence and deferred-risk handoffs; no false deployment claim |
| 6 Job/Notification | JobRunner, scheduling, dispatch and retry/bootstrap ownership | Phase 5 local side-effect boundaries plus explicit 5-7a/F-02 handoffs | Explicit runtime owner, durable Job control/creation state, attempt-O11y boundary, idempotency/retry policy and lifecycle proof; `6-0`, D6-N-01, D6-J-02 and D6-F-01 have closed the read-only owner design before execution |
| 7 Observability | Telemetry, analytics, operational signals and authority boundaries | Prior domain surfaces and Job/program-O11y boundary stable | Signals follow domain semantics without becoming product truth |
| 8 Global review | Cross-phase consistency, expired compatibility and report-first findings | Phases 3–7 exited | Global fitness review, targeted cleanup, durable-doc/link/gate reconciliation |

## Program Guardrails

- Later-phase scope must not leak into an earlier phase merely because a dependency is nearby.
- Every executable slice uses poly-file/per-sub-folder task packets, explicit entry delta, rehearsal, evidence index
  and verification log.
- Compatibility is removed only after its replacement has both focused and cross-unit proof.
- Global cleanup is evidence-driven: no broad formatting, directory churn or dead-code deletion disguised as
  architecture progress.
- A deferred risk may cross phases only through explicit ownership, atomicity,
  retry/idempotency and proof decisions. Owner state or operator workflow is
  added only when the business semantics actually require it.
